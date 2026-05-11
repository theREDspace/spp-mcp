import { DateContainer } from './Timesheet.js'

export interface Paymentterms {
  id: string;                               // [Read-only] Unique ID  [oai_citation:0‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  active: 0 | 1;                            // 1 = active, 0 = inactive  [oai_citation:1‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  default_terms: 0 | 1;                     // 1 = default terms  [oai_citation:2‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  name: string;                             // [Required] Name  [oai_citation:3‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  notes?: string;                           // Notes  [oai_citation:4‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  created: DateContainer;                   // [Read-only] Creation timestamp  [oai_citation:5‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
  updated: DateContainer;                   // [Read-only] Last modified  [oai_citation:6‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
}

export interface PaymenttermsWrapper {
  Paymentterms: Paymentterms;
  status: string;
}
