export interface NodeData {
  label: string;
  inputs: Array<{
    id: string;
    label: string;
    type: 'execution' | 'data';
  }>;
  outputs: Array<{
    id: string;
    label: string;
    type: 'execution' | 'data';
  }>;
  parameters: Record<string, any>;
}
