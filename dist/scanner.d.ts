export type ModelFamily = "gpt" | "claude" | "gemini" | "deepseek" | "unknown";
export type ModelMarker = "mini" | "nano" | "pro" | "haiku" | "sonnet" | "opus" | "flash" | "flash-lite" | null;
export interface Classification {
    family: ModelFamily;
    marker: ModelMarker;
}
export declare function classify(modelId: string | null | undefined): Classification;
export declare function versionTuple(modelId: string | null | undefined): number[];
export declare function cmpVersions(a: number[], b: number[]): number;
export declare function candidatesFor(allIds: string[], currentId: string): string[];
export declare function pickLatest(candidates: string[]): string | null;
export interface RegistryRow {
    name: string;
    modelId: string;
    provider: string;
    baseUrl?: string;
    apiKeyEnv?: string;
    _ref?: unknown;
}
export interface ChangeRecord {
    name: string;
    oldId: string;
    newId: string;
    _ref?: unknown;
    error?: string;
}
export interface SkipRecord {
    name: string;
    reason: string;
}
export interface ScanAndUpdateOpts {
    listRows: () => Promise<RegistryRow[]>;
    fetchCatalogs: (groups: Map<string, RegistryRow[]>) => Promise<Map<string, string[]> | Record<string, string[]>>;
    updateRow?: (change: ChangeRecord, newId: string) => Promise<void>;
    dryRun?: boolean;
}
export interface ScanAndUpdateResult {
    changed: ChangeRecord[];
    skipped: SkipRecord[];
}
export declare function scanAndUpdate(opts: ScanAndUpdateOpts): Promise<ScanAndUpdateResult>;
//# sourceMappingURL=scanner.d.ts.map