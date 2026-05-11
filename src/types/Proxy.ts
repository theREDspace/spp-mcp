
/** Proxy configuration for SuiteProjects Pro */
export interface Proxy {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  active: 0 | 1;
  created: string;
  updated: string;
}

export interface ProxyWrapper {
  Proxy: Proxy;
  status: string;
}