export interface ICreateGraphqlClientOptions<T> {
  url: string;
  ws?: boolean;
  splitter?: string;
  wsGetConnectionParams?(apiClient: T): Promise<Record<string, string>>;
}
