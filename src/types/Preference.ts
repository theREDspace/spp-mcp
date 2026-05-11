import { DateContainer } from './Timesheet.js';
export interface Preference {
  id: string;                             // [Read-only]  [oai_citation:39‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  group_name?: string;                    // Group name  [oai_citation:40‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  name: string;                           // Preference name  [oai_citation:41‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  setting: string;                        // Stored data  [oai_citation:42‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  userid: string                        // Specific to user if set  [oai_citation:43‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  created: DateContainer;                 // [Read-only]  [oai_citation:44‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  updated: DateContainer;                 // [Read-only]  [oai_citation:45‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
}

export interface PreferenceWrapper {
  Preference: Preference;
  status: string;
}