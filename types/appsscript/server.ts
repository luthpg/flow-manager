import type { FlowGraphData, FlowMeta, Role } from '~/types/flow';

export interface WebAppParams<T extends string = string>
  extends GoogleAppsScript.Events.DoGet {
  parameter: Record<T, string>;
  parameters: Record<T, string[]>;
}

export type ServerParams = WebAppParams & {
  siteTitle: string;
  userAddress: string;
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 編集画面・閲覧画面の初期ロード用レスポンス
export interface FlowLoadResponse {
  meta: FlowMeta;
  /** * JSON文字列ではなく、パース済みのオブジェクトとして定義します。
   * (サーバー側で文字列として取得後、クライアントに返す前にパースするか、
   * クライアント側でパースしてこの型にキャストします)
   */
  graphData: FlowGraphData;
  userRole: Role;
  /** 最新バージョンID (編集中ドラフトID または 公開ID) */
  activeVersionId: string;
}
