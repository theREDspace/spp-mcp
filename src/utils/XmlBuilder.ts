// src/utils/XmlBuilder.ts
export class XmlBuilder {
  /**
   * Maps TypeScript-friendly BOName keys to their actual SPP XML API type names.
   * SPP XML type names follow the pattern used in the API schema.
   * Add entries here whenever a BOName key does not match the SPP XML type name 1:1.
   */
  private static readonly SPP_TYPE_NAME_MAP: Record<string, string> = {
    ProjectAssign: "Projectassign",
    ProjectAssignmentProfile: "ProjectAssignmentProfile",
    ProjectTaskAssign: "ProjectTaskAssign",
  };

  /**
   * Maps business object names to their correct filter element names.
   * Some business objects use a different element name in filter XML than in the Read type attribute.
   * For example, ProjectAssign queries use type="Projectassign" but filter elements should be <ProjectAssign>.
   */
  private static readonly FILTER_ELEMENT_MAP: Record<string, string> = {
    Projectassign: "ProjectAssign",
    ProjectAssignmentProfile: "ProjectAssignmentProfile",
    ProjectTaskAssign: "ProjectTaskAssign",
  };

  /** Resolves the correct SPP XML API type name for a given BOName. */
  static resolveSPPTypeName(bo: string): string {
    return XmlBuilder.SPP_TYPE_NAME_MAP[bo] ?? bo;
  }

  /** Resolves the correct filter element name for a given SPP type name. */
  static resolveFilterElementName(sppType: string): string {
    return XmlBuilder.FILTER_ELEMENT_MAP[sppType] ?? sppType;
  }

  // ─── READ ───────────────────────────────────────────────────────────
  static buildGet(
    type: string,
    filter: Record<string, any> = {},
    limit = 1000,
    offset = -1,
    method?: "equal to" | "not equal to" | "all" | "newer-than" | "older-than"
  ): string {
    // Resolve to the actual SPP XML API type name (may differ from the TypeScript BOName key)
    const sppType = XmlBuilder.resolveSPPTypeName(type);
    // Resolve the filter element name (may differ from the SPP type name)
    const filterElementName = XmlBuilder.resolveFilterElementName(sppType);
    const nullFilter = Object.values(filter).some((v) => v === null);
    let filterXML = "";

    if (Object.keys(filter).length) {
      filterXML = `<${filterElementName}>
  ${Object.entries(filter)
    .map(([k, v]) => {
      // if someone passed in a full <Date>…</Date> fragment as a string
      if (typeof v === "string" && v.trim().startsWith("<Date>")) {
        return `<${k}>${v}</${k}>`;
      }
      // otherwise normal scalar
      return v !== null ? `<${k}>${v}</${k}>` : `<${k}/>`;
    })
    .join("\n  ")}
</${filterElementName}>`;
    }

    const actualMethod =
      method || (Object.keys(filter).length ? "equal to" : "all");

    // Add field="date" for newer-than/older-than methods
    const fieldAttr =
      actualMethod === "newer-than" || actualMethod === "older-than"
        ? ' field="date"'
        : "";

    return `<Read type="${sppType}" enable_custom="1" method="${actualMethod}" limit="${
      offset > 0 ? `${offset},${limit}` : limit
    }"${nullFilter ? ' empty_is_nil="false"' : ""}${fieldAttr}>
  ${filterXML}
</Read>`;
  }

  // TODO: move this to where it makes sense
  static buildCustom(query: string): string {
    return query; // Now returns the query directly without wrapping
  }

  // ─── CREATE / ADD ─────────────────────────────────────────────────
  // Needs to check for nested objects and arrays, and convert them to XML. otherwise will default to values you dont want (like trying to add a Date object)
  static buildAdd(type: string, payloads: Record<string, any>[]): string {
    function toXML(key: string, value: any): string {
      // Handle date fields (customize field names as needed)
      if (
        typeof value === "string" &&
        key.toLowerCase().includes("date") &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        // If the key looks like a date field and value is YYYY-MM-DD
        return `<${key}>${XmlBuilder.buildDateStringXML(value)}</${key}>`;
      }
      if (typeof value === "object" && value !== null) {
        const inner = Object.entries(value)
          .map(([childKey, childVal]) => toXML(childKey, childVal))
          .join("");
        return `<${key}>${inner}</${key}>`;
      } else {
        return `<${key}>${value}</${key}>`;
      }
    }

    const xml = payloads
      .map((obj) => {
        const fields = Object.entries(obj)
          .map(([k, v]) => toXML(k, v))
          .join("");

        return `<Add type="${type}" enable_custom="1">
  <${type}>
    ${fields}
    <Return><id/></Return>
  </${type}>
</Add>`;
      })
      .join("\n");

    return xml;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────
  static buildUpdate(
    type: string,
    updates:
      | { id: string; changes: Record<string, any> }
      | { id: string; changes: Record<string, any> }[]
  ): string {
    const updateArray = Array.isArray(updates) ? updates : [updates];

    return updateArray
      .map(({ id, changes }) => {
        const body = Object.entries(changes)
          .map(([k, v]) => {
            if (k === "date") {
              const dateXml =
                typeof v === "string"
                  ? XmlBuilder.buildDateStringXML(v)
                  : XmlBuilder.buildDateStringXML(
                      `${(v as any).year}-${(v as any).month}-${(v as any).day}`
                    );
              return `<date>${dateXml}</date>`;
            }
            if (typeof v === "object") {
              return `<${k}>${JSON.stringify(v)}</${k}>`;
            }
            return `<${k}>${v}</${k}>`;
          })
          .join("");

        return `<Modify type="${type}" enable_custom="1">
  <${type}>
    <id>${id}</id>
    ${body}
    <Return><id/></Return>
  </${type}>
</Modify>`;
      })
      .join("\n");
  }
  // ─── DELETE ───────────────────────────────────────────────────────
  static buildDelete(type: string, ids: string | string[]): string {
    const idArray = Array.isArray(ids) ? ids : [ids];
    // Build one <Delete> block per ID, then join them
    return idArray
      .map(
        (i) => `<Delete type="${type}">
  <${type}>
    <id>${i}</id>
  </${type}>
</Delete>`
      )
      .join("\n");
  }

  // ─── CREATEUSER ──────────────────────────────────────────────────
  /**
   * Build CreateUser XML command for adding or updating a User object
   */
  static buildCreateUser(
    user: Record<string, any>,
    company: Record<string, any>,
    options: {
      enableCustom?: boolean;
      excludeFlags?: boolean;
      lookup?: string;
    } = {}
  ): string {
    const { enableCustom = true, excludeFlags = false, lookup } = options;

    function toXML(key: string, value: any): string {
      // Handle date fields
      if (
        typeof value === "string" &&
        key.toLowerCase().includes("date") &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return `<${key}>${XmlBuilder.buildDateStringXML(value)}</${key}>`;
      }

      // Handle address objects (addr key becomes Address element directly)
      if (key === "address" && typeof value === "object" && value !== null) {
        const addressFields = Object.entries(value)
          .map(
            ([childKey, childVal]) => `<${childKey}>${childVal}</${childKey}>`
          )
          .join("");
        return `<addr><Address>${addressFields}</Address></addr>`;
      }

      // Handle other nested objects
      if (typeof value === "object" && value !== null) {
        const inner = Object.entries(value)
          .map(([childKey, childVal]) => toXML(childKey, childVal))
          .join("");
        return `<${key}>${inner}</${key}>`;
      } else {
        return `<${key}>${value}</${key}>`;
      }
    }

    // Build Company XML - REQUIRED for CreateUser
    const companyFields = Object.entries(company)
      .map(([k, v]) => toXML(k, v))
      .join("\n    ");
    const companyXML = `<Company>\n    ${companyFields}\n  </Company>\n  `;

    if (!user.password) {
      // Set a default password if none provided
      // this is required by SPP API
      // Generate a random password with uppercase, lowercase, and numbers
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      user.password = Array.from({ length: 64 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
    }

    // Build User XML
    const userFields = Object.entries(user)
      .map(([k, v]) => toXML(k, v))
      .join("\n    ");

    // Build attributes string
    let attributes = "";
    if (enableCustom) attributes += ' enable_custom="1"';
    if (excludeFlags) attributes += ' exclude_flags="1"';
    if (lookup) attributes += ` lookup="${lookup}"`;

    return `<CreateUser${attributes}>
  ${companyXML}<User>
    ${userFields}
  </User>
</CreateUser>`;
  }

  // ─── DATE helper ──────────────────────────────────────────────────
  /**
   * Turn a YYYY-MM-DD string into the SPP <Date> XML block.
   */
  static buildDateStringXML(date: string): string {
    const [year, month, day] = date.split("-");
    if (!year || !month || !day) {
      throw new Error(
        `Invalid date format for buildDateStringXML: ${date}. Expected YYYY-MM-DD.`
      );
    }

    // zero-pad month/day to two digits
    const mm = month.padStart(2, "0"); // "07" instead of "7"
    const dd = day.padStart(2, "0"); // "05" instead of "5"

    return `
      <Date>
        <year>${year}</year>
        <month>${mm}</month>
        <day>${dd}</day>
        <hour/>
        <minute/>
        <timezone/>
        <second/>
      </Date>
    `;
  }
}
