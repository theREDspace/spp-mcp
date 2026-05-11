// src/SPP/errorCodes.ts

// All Important SPP status codes
export enum SPPStatus {
  Success            = 0,
  UnknownError       = 1,
  AuthInvalid        = 2,
  TooManyArgs        = 3,
  TooFewArgs         = 4,
  UnknownComm        = 5,
  InvalidURL         = 6,
  InvalidOfflineVer  = 7,
  FailureDynamic     = 8,
  LoggedOut          = 9,
  InvalidParameters  = 10,

  // 200–399: create‑user errors
  UserInvalidCompany     = 201,
  UserDupNickname        = 202,
  UserTooFewArgs         = 203,
  UserNamespaceError     = 204,
  UserWorkschedError     = 205,
  UserRoleError          = 206,

  // 300–399: create‑user / account
  PasswordPolicy         = 303,
  CreateAccountDisabled  = 304,
  PasswordEditDisabled   = 305,

  // 400–599: auth & account
  AuthFailed             = 401,
  AccountCanceled        = 409,
  AccountConflict        = 411,
  Privilege              = 413,
  ServiceDown            = 414,
  AccountArchived        = 415,
  RestrictedIPAddress    = 417,
  InvalidUidSession      = 418,
  AuthFailedRetry        = 419,
  SAMLAuthFailed         = 420,
  SAMLMisconfig          = 421,
  NoServerStatusPerm     = 423,
  ModifyPermis           = 424,
  DisabledFeat           = 425, 
  MissingKey             = 503, 
  BadNamespace           = 504, 
  LargeBatch             = 555, 
  RateLimit              = 556, 


  // 600–799: object‑specific lookup / dependency
  NotFound               = 601, 
  InvalidField           = 602, 
  InvalidType            = 603, 
  LimitClause            = 605, 
  DependCheck            = 701, 

  // 800–919: application‑level business rules
  TakenNumber            = 828,
  InvalidPurchaseOrder   = 905,
  InvalidCostCenter      = 906,
  InvalidContact         = 907,
  InvalidName            = 908,
  InvalidAssocContact    = 909,
  LookupNotLocated       = 910,
  NoTimesheetSpecified   = 911,
  InvalidProjectTaskType = 912,
  InvalidProjectTask     = 913,
  InvalidResourceProfile = 914,
  InvalidResourceType    = 915,
  TableHasNoExternalId   = 916,
  IssueNumberTaken       = 917,
  IssueNoDescription     = 918,
  IssueStageDefaultOnly  = 919,
  RateCardItemNoRateCardIdSpecified = 920,
  RateCardItemJobCodeInUse          = 921,
  RateCardItemInvalidJobCode        = 922,
  RateCardItemInvalidRateCard       = 923,
  RateCardItemNoJobCodeIdSpecified  = 924,

  // Project Errors (925, 934, 943)
  ProjectInvalidTemplateProjectId      = 925,
  ProjectErrorCreatingFromTemplate   = 934,
  ProjectNameNotUniqueByCustomer     = 943,

  // User Errors (926-927, 930, 935, 941, 1051, 1410, 1411, 1419, 1420, 1421)
  UserInvalidUserCost                      = 926,
  UserInvalidUserCostStartDate           = 927,
  UserGenericFlagCannotBeModified        = 930,
  UserInvalidUserTagStartDate            = 935,
  UserInvalidTimezone                    = 941,
  UserCannotAssignMultipleNodesInHierarchy = 1051,
  UserCannotDeactivateNsIntegrationUser  = 1410,
  UserCannotChangeAdminRoleOfNsIntegrationUser = 1411,
  UserNoFullLicensesAvailable            = 1419,
  UserNoTAndELicensesAvailable           = 1420,
  UserNoGuestLicensesAvailable           = 1421,

  // WorkspaceUser Errors (928-929)
  WorkspaceUserInvalidProjectGroupId         = 928,
  WorkspaceUserCannotContainProjectGroupAndUser = 929,

  // ProjectAssign Errors (931)
  ProjectAssignDuplicateAssignment = 931,

  // Proxy Errors (932-933, 952)
  ProxyUpdateRequiresAdmin = 932,
  ProxyInvalidProxyUser    = 933,
  ProxyDuplicateEntryForUser = 952, // Also ProjecttaskEstimate

  // ProjectGroup Errors (936)
  ProjectGroupErrorCreatingAssignments = 936,

  // Agreement/Attachment Errors (937, 938)
  InvalidAgreementId           = 937, // Applies to Agreement_to_project, Attachment
  AgreementToProjectDuplicate  = 938,

  // MakeURL Errors (939-940)
  MakeURLViewNotAllowedForUser             = 939,
  MakeURLDashboardViewNotAllowedForProject = 940,

  // LoadedCost Errors (942)
  LoadedCostNotAllowedForGenericResource = 942,

  // Envelope/Timesheet Errors (944)
  InvalidDate = 944, // Applies to Envelope, Timesheet

  // ProjectBudgetRule Errors (945, 953)
  ProjectBudgetRuleInvalidProjectBudgetGroupId = 945,
  ProjectBudgetRuleMissingLaborSubcategory   = 953, // Also ProjectBudgetTransaction

  // ProjectBudgetTransaction Errors (946, 953)
  ProjectBudgetTransactionInvalidProjectBudgetRuleId = 946,
  ProjectBudgetTransactionMissingLaborSubcategory  = 953, // Also ProjectBudgetRule

  // ExpensePolicy Errors (947)
  ExpensePolicyProjectAlreadyHasPolicy = 947,

  // ExpensePolicyItem Errors (948)
  ExpensePolicyItemDuplicateItemId = 948,

  // AttributeDescription Errors (949-951)
  AttributeDescriptionInvalidResourceProfileTypeId = 949,
  AttributeDescriptionInvalidAttributeId           = 950,
  AttributeDescriptionDuplicateAttributeForResourceProfileType = 951,

  // ProjecttaskEstimate Errors (952)
  ProjecttaskEstimateDuplicateEntryForUser = 952, // Also Proxy

  // RevenueRecognitionRule Errors (954)
  RevenueRecognitionRuleInvalidProjectBillingRuleId = 954,

  // ResourceAttachment Errors (960-963)
  ResourceAttachmentInvalidType           = 960,
  ResourceAttachmentDuplicateEntryForUser = 961,
  ResourceAttachmentCannotBeModified      = 962,
  ResourceAttachmentInvalidAttachmentId   = 963,

  // Attachment Errors (964-965)
  AttachmentInvalidResourceAttachmentId = 964,
  AttachmentFileCouldNotBeSaved       = 965,

  // Approval Errors (1001-1003)
  InvalidStateForApprovalOperation = 1001,
  ApprovalOperationError           = 1002,
  ApprovalOperationWarning         = 1003,

  // Hierarchy Errors (1050)
  InvalidHierarchyNodeSpecified = 1050, // Applies to HierarchyNode, User

  // Custom Field Errors (1100-1106)
  InvalidValueForCheckboxCustomField      = 1100,
  ValueNotInListOfValuesForCustomField    = 1101,
  CustFieldCouldNotBeSaved                = 1102,
  CustFieldModificationNotSupported       = 1103,
  CustomFieldValueNotUnique               = 1104,
  ValueNotInSourcePickListForCustomField  = 1105,
  InlineCustomFieldsUpdateFailed          = 1106,

  // ModifyOnCondition Errors (1200)
  ModifyOnConditionConditionNotMet = 1200,

  // FilterSet Errors (1300)
  InvalidFilterSetSpecified = 1300,

  // Timesheet Errors (1400-1403)
  TimesheetMissingStartEndMonthTsFlag = 1400,
  TimesheetInvalidAssociatedTmid      = 1401,
  TimesheetNonOverlappingTimesheet    = 1402,
  TimesheetCannotModifyWithAssociatedTmid = 1403,

  // Task Errors (1404-1407)
  TaskInvalidTime                 = 1404,
  TaskIllegalTimeRange            = 1405,
  TaskNoPermissionToEditTimeData  = 1406,
  TaskInvalidHours                = 1407,

  // Newsfeed Errors (1408-1409)
  InvalidNewsfeed                      = 1408, // Applies to NewsfeedMessage, Project
  NewsfeedMessageAuthorOrEditorNotSet  = 1409,

  // Ticket Errors (1412)
  TicketInvalidQuantity = 1412,

  // Invoice Errors (1413)
  InvoiceInvalidPaymentTerms = 1413,

  // ScheduleRequest Errors (1414)
  ScheduleRequestInvalidApprovalStatus = 1414,

  // Projecttask/Projecttaskassign Errors (1415)
  PhaseCannotBeAssigned = 1415, // Applies to Projecttask, Projecttaskassign

  // ProjectBillingRule Errors (1416-1417)
  ProjectBillingRuleInvalidCapByCustomerPO = 1416,
  ProjectBillingRuleInvalidProjectTaskId   = 1417,

  // Preference Errors (1418)
  PreferenceInvalidSettingsFormat = 1418,

  // --- Hypothetical/Release Note Errors ---
  MissingAddressObject = 1422, // Mentioned in release notes, assumed 400
  AccessToExpensesModuleDenied = 1500, // Mentioned in release notes, assumed 403

  // Generic API Errors (2001-2002)
  InvalidArgumentPassed = 2001,
  InvalidFormatPassed   = 2002,

  // Added new error codes for unsupported operations and malformed responses.
  UnsupportedOperation = "UnsupportedOperation",
  MalformedResponse = "MalformedResponse",
}

// Map numeric code → human name & suggested HTTP status
export const SPPStatusInfo: Record<SPPStatus, {
  name: string;
  httpStatus: number;
  description?: string;
}> = {
  [SPPStatus.Success]: {
    name: "Success",
    httpStatus: 200,
    description: "The operation completed successfully",
  },
  [SPPStatus.UnknownError]: {
    name: "UnknownError",
    httpStatus: 500,
    description: "An unknown error occurred. Try again and if the problem persists, contact support",
  },
  [SPPStatus.AuthInvalid]: {
    name: "AuthInvalid",
    httpStatus: 401,
    description: "Not logged in or invalid access token",
  },
  [SPPStatus.TooManyArgs]: {
    name: "TooManyArgs",
    httpStatus: 400,
    description: "The API request included too many arguments for one of the commands",
  },
  [SPPStatus.TooFewArgs]: {
    name: "TooFewArgs",
    httpStatus: 400,
    description: "The API request did not include enough arguments for one of the commands",
  },
  [SPPStatus.UnknownComm]: {
    name: "UnknownCommand",
    httpStatus: 400,
    description: "One of the commands in your API request uses an unknown method",
  },
  [SPPStatus.InvalidURL]: {
    name: "InvalidURL",
    httpStatus: 400,
    description: "The URL used to access the API is not valid",
  },
  [SPPStatus.InvalidOfflineVer]: {
    name: "InvalidOfflineVersion",
    httpStatus: 400,
    description: "The version of SuiteProjects Pro Offline is not supported",
  },
  [SPPStatus.FailureDynamic]: {
    name: "FailureDynamic",
    httpStatus: 500, // Could also be 400 depending on context, but 500 implies server-side processing failed based on input
    description: "The operation was unsuccessful. Review the Error record included in the response",
  },
  [SPPStatus.LoggedOut]: {
    name: "LoggedOut",
    httpStatus: 401,
    description: "SessionId or accessToken is not valid or has expired",
  },
  [SPPStatus.InvalidParameters]: {
    name: "InvalidParameters",
    httpStatus: 400,
    description: "Invalid parameters used. Verify your API request",
  },

  // 200–206 create‑user
  [SPPStatus.UserInvalidCompany]: {
    name: "UserInvalidCompany",
    httpStatus: 404, // Or 400 Bad Request if considered invalid input
    description: "The specified company does not exist",
  },
  [SPPStatus.UserDupNickname]: {
    name: "UserDuplicateNickname",
    httpStatus: 409,
    description: "There is already a user with the same User ID (nickname)",
  },
  [SPPStatus.UserTooFewArgs]: {
    name: "UserTooFewArguments",
    httpStatus: 400,
    description: "Both a company object and a user object must be specified",
  },
  [SPPStatus.UserNamespaceError]: {
    name: "UserNamespaceError",
    httpStatus: 400,
    description: "Users must be created in the same namespace as the company",
  },
  [SPPStatus.UserWorkschedError]: {
    name: "UserWorkscheduleError",
    httpStatus: 400,
    description: "Invalid account workschedule specified",
  },
  [SPPStatus.UserRoleError]: {
    name: "UserRoleError",
    httpStatus: 400,
    description: "Invalid role specified",
  },

  // 303–305
  [SPPStatus.PasswordPolicy]: {
    name: "PasswordPolicyViolation",
    httpStatus: 400,
    description: "Password does not meet the minimum policy requirements",
  },
  [SPPStatus.CreateAccountDisabled]: {
    name: "CreateAccountDisabled",
    httpStatus: 403,
    description: "The CreateAccount method is not available to SuiteProjects Pro customers",
  },
  [SPPStatus.PasswordEditDisabled]: {
    name: "PasswordEditDisabled",
    httpStatus: 403,
    description: "Password cannot be modified or user uses SAML SSO",
  },

  // 401–556 auth, account, limits etc.
  [SPPStatus.AuthFailed]: {
    name: "AuthFailed",
    httpStatus: 401,
    description: "Access denied. Invalid company/user/password",
  },
  [SPPStatus.AccountCanceled]: {
    name: "AccountCanceled",
    httpStatus: 403, // Forbidden access
    description: "The account was canceled and cannot be accessed",
  },
  [SPPStatus.AccountConflict]: {
    name: "AccountConflict",
    httpStatus: 409,
    description: "There is a problem with the account. Contact support",
  },
  [SPPStatus.Privilege]: {
    name: "PrivilegeRequired",
    httpStatus: 403,
    description: "API access is not permitted for this account or user",
  },
  [SPPStatus.ServiceDown]: {
    name: "ServiceDown",
    httpStatus: 503,
    description: "Service temporarily unavailable",
  },
  [SPPStatus.AccountArchived]: {
    name: "AccountArchived",
    httpStatus: 403, // Forbidden access
    description: "The account was archived and cannot be accessed",
  },
  [SPPStatus.RestrictedIPAddress]: {
    name: "RestrictedIPAddress",
    httpStatus: 403,
    description: "Access not allowed from this IP address",
  },
  [SPPStatus.InvalidUidSession]: {
    name: "InvalidUidSession",
    httpStatus: 401,
    description: "The uid specified is not valid. Repeat authentication",
  },
  [SPPStatus.AuthFailedRetry]: {
    name: "AuthFailedPleaseRetry",
    httpStatus: 401, // Still an auth failure, but potentially transient
    description: "Unexpected authentication failure; please retry",
  },
  [SPPStatus.SAMLAuthFailed]: {
    name: "SAMLAuthFailed",
    httpStatus: 401,
    description: "SAML single sign-on authentication error",
  },
  [SPPStatus.SAMLMisconfig]: {
    name: "SAMLMisconfiguration",
    httpStatus: 500, // Server-side configuration issue prevents auth
    description: "SAML misconfiguration or invalid assertion",
  },
  [SPPStatus.NoServerStatusPerm]: {
    name: "NoServerStatusPermission",
    httpStatus: 403,
    description: "No permissions to read ServerStatus data",
  },
  [SPPStatus.ModifyPermis]: {
    name: "NoModifyPermission",
    httpStatus: 403,
    description: "No permissions to modify data",
  },
  [SPPStatus.DisabledFeat]: {
    name: "DisabledFeature",
    httpStatus: 403, // Or 400 if considered a bad request to use it
    description: "The requested feature is disabled for this account or installation.",
  },
  [SPPStatus.MissingKey]: {
    name: "MissingKey",
    httpStatus: 403, // Could be 401 if the key is for authentication, or 400 if a required param key
    description: "Required key (e.g., API key) is missing or invalid.",
  },
  [SPPStatus.BadNamespace]: {
    name: "BadNamespace",
    httpStatus: 400,
    description: "Invalid or incorrect namespace specified.",
  },
  [SPPStatus.LargeBatch]: {
    name: "LargeBatch",
    httpStatus: 413, // Payload Too Large
    description: "The batch request is too large. Reduce the number of operations per request.",
  },
  [SPPStatus.RateLimit]: {
    name: "RateLimitExceeded",
    httpStatus: 429, // Too Many Requests
    description: "API rate limit exceeded. Please try again later.",
  },

  // 600–799 object lookup/dependency
  [SPPStatus.NotFound]: {
    name: "NotFound",
    httpStatus: 404,
    description: "The requested object or record was not found.",
  },
  [SPPStatus.InvalidField]: {
    name: "InvalidField",
    httpStatus: 400,
    description: "An invalid field name was specified in the request.",
  },
  [SPPStatus.InvalidType]: {
    name: "InvalidType",
    httpStatus: 400,
    description: "An invalid data type was provided for a field.",
  },
  [SPPStatus.LimitClause]: {
    name: "InvalidLimitClause",
    httpStatus: 400,
    description: "Invalid limit clause specified in the query.",
  },
  [SPPStatus.DependCheck]: {
    name: "DependencyCheckFailed",
    httpStatus: 409, // Conflict due to dependencies
    description: "Dependency check failed; the operation cannot be completed due to related records or state.",
  },

  // 800–919 business rules
  [SPPStatus.TakenNumber]: {
    name: "InvoiceNumberTaken", // Or just TakenNumber if generic
    httpStatus: 409,
    description: "This number (e.g., invoice number) is already taken.",
  },
  [SPPStatus.InvalidPurchaseOrder]: {
    name: "InvalidPurchaseOrder",
    httpStatus: 404, // Not found, or 400 if just invalid data
    description: "The specified purchase order does not exist or is deleted.",
  },
  [SPPStatus.InvalidCostCenter]: {
    name: "InvalidCostCenter",
    httpStatus: 404, // Not found, or 400 if just invalid data
    description: "The specified cost center does not exist or is inactive.",
  },
  [SPPStatus.InvalidContact]: {
    name: "InvalidContact",
    httpStatus: 400,
    description: "First name, last name and email are required fields for the contact.",
  },
  [SPPStatus.InvalidName]: {
    name: "InvalidName",
    httpStatus: 400,
    description: "A name must be specified.",
  },
  [SPPStatus.InvalidAssocContact]: {
    name: "InvalidAssociatedContact",
    httpStatus: 400, // Could be 404 if the contact doesn't exist
    description: "One of the associated contacts does not exist or is not linked to the customer.",
  },
  [SPPStatus.LookupNotLocated]: {
    name: "LookupNotLocated",
    httpStatus: 404, // Or 400 if it's invalid input
    description: "No record matching one or more lookup field values could be located.",
  },
  [SPPStatus.NoTimesheetSpecified]: {
    name: "NoTimesheetSpecified",
    httpStatus: 400,
    description: "The associated timesheet ID must be specified when modifying a time entry.",
  },
  [SPPStatus.InvalidProjectTaskType]: {
    name: "InvalidProjectTaskType",
    httpStatus: 400,
    description: "A valid project task type must be specified.",
  },
  [SPPStatus.InvalidProjectTask]: {
    name: "InvalidProjectTask",
    httpStatus: 400, // Or 404 if task doesn't exist
    description: "The specified project task is not part of the given project.",
  },
  [SPPStatus.InvalidResourceProfile]: {
    name: "InvalidResourceProfile",
    httpStatus: 400,
    description: "A valid resource profile type ID must be specified.",
  },
  [SPPStatus.InvalidResourceType]: {
    name: "InvalidResourceType",
    httpStatus: 400,
    description: "Type and resource profile type ID must match.",
  },
  [SPPStatus.TableHasNoExternalId]: {
    name: "TableHasNoExternalId",
    httpStatus: 400, // Configuration or schema issue, but triggered by bad request
    description: "The record type or lookup field does not support external IDs or does not exist.",
  },
  [SPPStatus.IssueNumberTaken]: {
    name: "IssueNumberTaken",
    httpStatus: 409,
    description: "The issue number is already taken.",
  },
  [SPPStatus.IssueNoDescription]: {
    name: "IssueNoDescription",
    httpStatus: 400,
    description: "An issue description must be specified.",
  },
  [SPPStatus.IssueStageDefaultOnly]: {
    name: "IssueStageDefaultOnly",
    httpStatus: 409, // State conflict
    description: "Only one default issue stage is allowed.",
  },
  [SPPStatus.RateCardItemNoRateCardIdSpecified]: {
    name: "RateCardItemNoRateCardIdSpecified",
    httpStatus: 400,
    description: "No rate card ID specified",
  },
  [SPPStatus.RateCardItemJobCodeInUse]: {
    name: "RateCardItemJobCodeInUse",
    httpStatus: 409,
    description: "Job code in use for rate card",
  },
  [SPPStatus.RateCardItemInvalidJobCode]: {
    name: "RateCardItemInvalidJobCode",
    httpStatus: 400,
    description: "Invalid job code specified",
  },
  [SPPStatus.RateCardItemInvalidRateCard]: {
    name: "RateCardItemInvalidRateCard",
    httpStatus: 400,
    description: "Invalid rate card specified",
  },
  [SPPStatus.RateCardItemNoJobCodeIdSpecified]: {
    name: "RateCardItemNoJobCodeIdSpecified",
    httpStatus: 400,
    description: "No job code ID specified",
  },
  [SPPStatus.ProjectInvalidTemplateProjectId]: {
    name: "ProjectInvalidTemplateProjectId",
    httpStatus: 400,
    description: "Invalid template project ID specified",
  },
  [SPPStatus.UserInvalidUserCost]: {
    name: "UserInvalidUserCost",
    httpStatus: 400,
    description: "Invalid value for user cost",
  },
  [SPPStatus.UserInvalidUserCostStartDate]: {
    name: "UserInvalidUserCostStartDate",
    httpStatus: 400,
    description: "Invalid user cost start date",
  },
  [SPPStatus.WorkspaceUserInvalidProjectGroupId]: {
    name: "WorkspaceUserInvalidProjectGroupId",
    httpStatus: 400,
    description: "Invalid project group ID for workspace user",
  },
  [SPPStatus.WorkspaceUserCannotContainProjectGroupAndUser]: {
    name: "WorkspaceUserCannotContainProjectGroupAndUser",
    httpStatus: 400,
    description: "Workspace user cannot contain both project group ID and user ID",
  },
  [SPPStatus.UserGenericFlagCannotBeModified]: {
    name: "UserGenericFlagCannotBeModified",
    httpStatus: 400,
    description: "Generic flag cannot be modified",
  },
  [SPPStatus.ProjectAssignDuplicateAssignment]: {
    name: "ProjectAssignDuplicateAssignment",
    httpStatus: 409,
    description: "Duplicate project assignment",
  },
  [SPPStatus.ProxyUpdateRequiresAdmin]: {
    name: "ProxyUpdateRequiresAdmin",
    httpStatus: 403,
    description: "Only admin users may update proxies",
  },
  [SPPStatus.ProxyInvalidProxyUser]: {
    name: "ProxyInvalidProxyUser",
    httpStatus: 400,
    description: "Not a valid proxy user",
  },
  [SPPStatus.ProjectErrorCreatingFromTemplate]: {
    name: "ProjectErrorCreatingFromTemplate",
    httpStatus: 500,
    description: "Error while creating project from template",
  },
  [SPPStatus.UserInvalidUserTagStartDate]: {
    name: "UserInvalidUserTagStartDate",
    httpStatus: 400,
    description: "Invalid user tag start date",
  },
  [SPPStatus.ProjectGroupErrorCreatingAssignments]: {
    name: "ProjectGroupErrorCreatingAssignments",
    httpStatus: 500,
    description: "Error while creating project group assignments",
  },
  [SPPStatus.InvalidAgreementId]: {
    name: "InvalidAgreementId",
    httpStatus: 400,
    description: "Invalid agreement ID specified",
  },
  [SPPStatus.AgreementToProjectDuplicate]: {
    name: "AgreementToProjectDuplicate",
    httpStatus: 409,
    description: "Duplicate agreement_to_project",
  },
  [SPPStatus.MakeURLViewNotAllowedForUser]: {
    name: "MakeURLViewNotAllowedForUser",
    httpStatus: 403,
    description: "View is not allowed for this user",
  },
  [SPPStatus.MakeURLDashboardViewNotAllowedForProject]: {
    name: "MakeURLDashboardViewNotAllowedForProject",
    httpStatus: 403,
    description: "Dashboard view is not allowed for this project",
  },
  [SPPStatus.UserInvalidTimezone]: {
    name: "UserInvalidTimezone",
    httpStatus: 400,
    description: "Invalid timezone specified for user",
  },
  [SPPStatus.LoadedCostNotAllowedForGenericResource]: {
    name: "LoadedCostNotAllowedForGenericResource",
    httpStatus: 400,
    description: "Loaded costs not allowed for generic resources",
  },
  [SPPStatus.ProjectNameNotUniqueByCustomer]: {
    name: "ProjectNameNotUniqueByCustomer",
    httpStatus: 409,
    description: "Project names must be unique by customer",
  },
  [SPPStatus.InvalidDate]: {
    name: "InvalidDate",
    httpStatus: 400,
    description: "Invalid date",
  },
  [SPPStatus.ProjectBudgetRuleInvalidProjectBudgetGroupId]: {
    name: "ProjectBudgetRuleInvalidProjectBudgetGroupId",
    httpStatus: 400,
    description: "Invalid Project budget group ID specified",
  },
  [SPPStatus.ProjectBudgetTransactionInvalidProjectBudgetRuleId]: {
    name: "ProjectBudgetTransactionInvalidProjectBudgetRuleId",
    httpStatus: 400,
    description: "Invalid project budget rule ID specified",
  },
  [SPPStatus.ExpensePolicyProjectAlreadyHasPolicy]: {
    name: "ExpensePolicyProjectAlreadyHasPolicy",
    httpStatus: 409,
    description: "Project already has an expense policy",
  },
  [SPPStatus.ExpensePolicyItemDuplicateItemId]: {
    name: "ExpensePolicyItemDuplicateItemId",
    httpStatus: 409,
    description: "Duplicate itemid for expense policy",
  },
  [SPPStatus.AttributeDescriptionInvalidResourceProfileTypeId]: {
    name: "AttributeDescriptionInvalidResourceProfileTypeId",
    httpStatus: 400,
    description: "Invalid Resourceprofile_type ID specified",
  },
  [SPPStatus.AttributeDescriptionInvalidAttributeId]: {
    name: "AttributeDescriptionInvalidAttributeId",
    httpStatus: 400,
    description: "Invalid Attribute ID specified",
  },
  [SPPStatus.AttributeDescriptionDuplicateAttributeForResourceProfileType]: {
    name: "AttributeDescriptionDuplicateAttributeForResourceProfileType",
    httpStatus: 409,
    description: "Duplicate Attribute for Resourceprofile_type",
  },
  [SPPStatus.ProxyDuplicateEntryForUser]: { 
    name: "DuplicateEntryForUser",
    httpStatus: 409,
    description: "Duplicate entry for user",
  },
  [SPPStatus.ProjectBudgetRuleMissingLaborSubcategory]: { 
    name: "MissingLaborSubcategory",
    httpStatus: 400,
    description: "Missing labor subcategory",
  },
  [SPPStatus.RevenueRecognitionRuleInvalidProjectBillingRuleId]: {
    name: "RevenueRecognitionRuleInvalidProjectBillingRuleId",
    httpStatus: 400,
    description: "Invalid Project billing rule ID specified",
  },
  [SPPStatus.ResourceAttachmentInvalidType]: {
    name: "ResourceAttachmentInvalidType",
    httpStatus: 400,
    description: "Invalid Resource attachment type",
  },
  [SPPStatus.ResourceAttachmentDuplicateEntryForUser]: {
    name: "ResourceAttachmentDuplicateEntryForUser",
    httpStatus: 409,
    description: "Duplicate entry for user",
  },
  [SPPStatus.ResourceAttachmentCannotBeModified]: {
    name: "ResourceAttachmentCannotBeModified",
    httpStatus: 403,
    description: "ResourceAttachment cannot by modified",
  },
  [SPPStatus.ResourceAttachmentInvalidAttachmentId]: {
    name: "ResourceAttachmentInvalidAttachmentId",
    httpStatus: 400,
    description: "Invalid attachment id",
  },
  [SPPStatus.AttachmentInvalidResourceAttachmentId]: {
    name: "AttachmentInvalidResourceAttachmentId",
    httpStatus: 400,
    description: "Invalid ResourceAttachment id",
  },
  [SPPStatus.AttachmentFileCouldNotBeSaved]: {
    name: "AttachmentFileCouldNotBeSaved",
    httpStatus: 500,
    description: "File could not be saved",
  },
  [SPPStatus.InvalidStateForApprovalOperation]: {
    name: "InvalidStateForApprovalOperation",
    httpStatus: 400,
    description: "Invalid state",
  },
  [SPPStatus.ApprovalOperationError]: {
    name: "ApprovalOperationError",
    httpStatus: 500,
    description: "Submit/Approve/Reject error",
  },
  [SPPStatus.ApprovalOperationWarning]: {
    name: "ApprovalOperationWarning",
    httpStatus: 400,
    description: "Submit/Approve/Reject warning",
  },
  [SPPStatus.InvalidHierarchyNodeSpecified]: {
    name: "InvalidHierarchyNodeSpecified",
    httpStatus: 400,
    description: "Invalid hierarchy node specified",
  },
  [SPPStatus.UserCannotAssignMultipleNodesInHierarchy]: {
    name: "UserCannotAssignMultipleNodesInHierarchy",
    httpStatus: 400,
    description: "You cannot assign multiple nodes within one hierarchy",
  },
  [SPPStatus.InvalidValueForCheckboxCustomField]: {
    name: "InvalidValueForCheckboxCustomField",
    httpStatus: 400,
    description: "Invalid value specified for a checkbox custom field",
  },
  [SPPStatus.ValueNotInListOfValuesForCustomField]: {
    name: "ValueNotInListOfValuesForCustomField",
    httpStatus: 400,
    description: "Value specified is not on the list of values for this custom field",
  },
  [SPPStatus.CustFieldCouldNotBeSaved]: {
    name: "CustFieldCouldNotBeSaved",
    httpStatus: 500,
    description: "Custom field could not be saved",
  },
  [SPPStatus.CustFieldModificationNotSupported]: {
    name: "CustFieldModificationNotSupported",
    httpStatus: 400,
    description: "Modification of the field specified is not supported",
  },
  [SPPStatus.CustomFieldValueNotUnique]: {
    name: "CustomFieldValueNotUnique",
    httpStatus: 409,
    description: "This custom field value is not unique",
  },
  [SPPStatus.ValueNotInSourcePickListForCustomField]: {
    name: "ValueNotInSourcePickListForCustomField",
    httpStatus: 400,
    description: "Value specified is not on the list of values in the source pick list defined for this custom field",
  },
  [SPPStatus.InlineCustomFieldsUpdateFailed]: {
    name: "InlineCustomFieldsUpdateFailed",
    httpStatus: 500,
    description: "One or more inline custom fields failed to be updated",
  },
  [SPPStatus.ModifyOnConditionConditionNotMet]: {
    name: "ModifyOnConditionConditionNotMet",
    httpStatus: 400, // Or potentially 200 with a specific status, but 400 indicates the *modification* failed
    description: "Condition not met",
  },
  [SPPStatus.InvalidFilterSetSpecified]: {
    name: "InvalidFilterSetSpecified",
    httpStatus: 400,
    description: "Invalid filter set specified",
  },
  [SPPStatus.TimesheetMissingStartEndMonthTsFlag]: {
    name: "TimesheetMissingStartEndMonthTsFlag",
    httpStatus: 400,
    description: "Missing start_end_month_ts flag",
  },
  [SPPStatus.TimesheetInvalidAssociatedTmid]: {
    name: "TimesheetInvalidAssociatedTmid",
    httpStatus: 400,
    description: "Invalid associated_tmid",
  },
  [SPPStatus.TimesheetNonOverlappingTimesheet]: {
    name: "TimesheetNonOverlappingTimesheet",
    httpStatus: 400,
    description: "Non-overlapping timesheet",
  },
  [SPPStatus.TimesheetCannotModifyWithAssociatedTmid]: {
    name: "TimesheetCannotModifyWithAssociatedTmid",
    httpStatus: 400,
    description: "Cannot modify timesheet with associated_tmid",
  },
  [SPPStatus.TaskInvalidTime]: {
    name: "TaskInvalidTime",
    httpStatus: 400,
    description: "Invalid time",
  },
  [SPPStatus.TaskIllegalTimeRange]: {
    name: "TaskIllegalTimeRange",
    httpStatus: 400,
    description: "Illegal time range",
  },
  [SPPStatus.TaskNoPermissionToEditTimeData]: {
    name: "TaskNoPermissionToEditTimeData",
    httpStatus: 403,
    description: "No permission to edit time data",
  },
  [SPPStatus.TaskInvalidHours]: {
    name: "TaskInvalidHours",
    httpStatus: 400,
    description: "Invalid hours",
  },
  [SPPStatus.InvalidNewsfeed]: {
    name: "InvalidNewsfeed",
    httpStatus: 400,
    description: "Invalid newsfeed",
  },
  [SPPStatus.NewsfeedMessageAuthorOrEditorNotSet]: {
    name: "NewsfeedMessageAuthorOrEditorNotSet",
    httpStatus: 400,
    description: "Both author or editor not set",
  },
  [SPPStatus.UserCannotDeactivateNsIntegrationUser]: {
    name: "UserCannotDeactivateNsIntegrationUser",
    httpStatus: 400,
    description: "Deactivate ns integration user",
  },
  [SPPStatus.UserCannotChangeAdminRoleOfNsIntegrationUser]: {
    name: "UserCannotChangeAdminRoleOfNsIntegrationUser",
    httpStatus: 400,
    description: "Change admin role of ns integration user",
  },
  [SPPStatus.TicketInvalidQuantity]: {
    name: "TicketInvalidQuantity",
    httpStatus: 400,
    description: "Invalid quantity",
  },
  [SPPStatus.InvoiceInvalidPaymentTerms]: {
    name: "InvoiceInvalidPaymentTerms",
    httpStatus: 400,
    description: "Invalid payment terms",
  },
  [SPPStatus.ScheduleRequestInvalidApprovalStatus]: {
    name: "ScheduleRequestInvalidApprovalStatus",
    httpStatus: 400,
    description: "Invalid approval status",
  },
  [SPPStatus.PhaseCannotBeAssigned]: {
    name: "PhaseCannotBeAssigned",
    httpStatus: 400,
    description: "Phase cannot be assigned",
  },
  [SPPStatus.ProjectBillingRuleInvalidCapByCustomerPO]: {
    name: "ProjectBillingRuleInvalidCapByCustomerPO",
    httpStatus: 400,
    description: "Invalid cap by customer PO",
  },
  [SPPStatus.ProjectBillingRuleInvalidProjectTaskId]: {
    name: "ProjectBillingRuleInvalidProjectTaskId",
    httpStatus: 400,
    description: "Invalid project task id",
  },
  [SPPStatus.PreferenceInvalidSettingsFormat]: {
    name: "PreferenceInvalidSettingsFormat",
    httpStatus: 400,
    description: "Invalid preference settings format",
  },
  [SPPStatus.UserNoFullLicensesAvailable]: {
    name: "UserNoFullLicensesAvailable",
    httpStatus: 400, // Could argue 403, but it's often a configuration/limit issue
    description: "No full user licenses available",
  },
  [SPPStatus.UserNoTAndELicensesAvailable]: {
    name: "UserNoTAndELicensesAvailable",
    httpStatus: 400, // Could argue 403
    description: "No T&E or full user licenses available",
  },
  [SPPStatus.UserNoGuestLicensesAvailable]: {
    name: "UserNoGuestLicensesAvailable",
    httpStatus: 400, // Could argue 403
    description: "No guest or full user licenses available",
  },
  [SPPStatus.MissingAddressObject]: {
      name: "MissingAddressObject",
      httpStatus: 400,
      description: "Missing Address object", // Based on release notes
  },
  [SPPStatus.AccessToExpensesModuleDenied]: {
      name: "AccessToExpensesModuleDenied",
      httpStatus: 403,
      description: "Access to the Expenses module denied", // Based on release notes
  },
  [SPPStatus.InvalidArgumentPassed]: {
    name: "InvalidArgumentPassed",
    httpStatus: 400,
    description: "Invalid argument passed",
  },
  [SPPStatus.InvalidFormatPassed]: {
    name: "InvalidFormatPassed",
    httpStatus: 400,
    description: "Invalid format passed",
  },
  [SPPStatus.UnsupportedOperation]: {
    name: "UnsupportedOperation",
    httpStatus: 400,
    description: "The operation is not supported",
  },
  [SPPStatus.MalformedResponse]: {
    name: "MalformedResponse",
    httpStatus: 500,
    description: "The server response was not in the expected format",
  },
};