export interface IGraphqlType {
  kind: 'OBJECT' | 'INPUT_OBJECT' | 'SCALAR' | 'ENUM';
  name: string;
  [key: string]: any;
}
