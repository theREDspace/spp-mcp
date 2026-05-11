// src/types/Address.ts (New file for Address definition)

export interface AddressBlock {
  addr1?: string;
  addr2?: string;
  addr3?: string;
  addr4?: string;
  city?: string;
  contact_id?: string; // internal ID of the associated contact
  country?: string;
  customer_only?: 'yes' | 'no'; // Used for backward compatibility with customer modification
  email?: string;
  fax?: string;
  first?: string;
  id?: string; // Unique ID, read-only
  last?: string;
  middle?: string;
  mobile?: string;
  phone?: string;
  salutation?: string;
  state?: string;
  zip?: string;
}

// This is the wrapper that the XML API expects, e.g., <addr><Address>...</Address></addr>
export interface AddressContainer {
  Address: AddressBlock;
}