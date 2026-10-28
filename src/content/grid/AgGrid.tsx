// AG Grid through its framework-free API (we use Preact, not React). Same major version and theme
// parameters as SA's grading table (frontend src/commons/agGrid/theme.ts), so both look alike.
import {
  AllCommunityModule,
  createGrid,
  type ColDef,
  type GridApi,
  type GridOptions,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { useEffect, useRef } from 'preact/hooks';

ModuleRegistry.registerModules([AllCommunityModule]);

export const saTheme = themeQuartz.withParams({
  fontSize: '13px',
  cellHorizontalPaddingScale: 0.8,
  // Not in v36's type definitions, but supported at runtime and used by SA.
  ...({ headerVerticalPaddingScale: 0.6 } as object),
});

type Props<T> = {
  /** Fixed options, read once when the grid is created. */
  options: GridOptions<T>;
  rowData: T[];
  columnDefs: ColDef<T>[];
  /** Shows the grid's loading overlay over the current rows. */
  loading?: boolean;
  class?: string;
};

export function AgGrid<T>({ options, rowData, columnDefs, loading = false, class: className }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GridApi<T> | null>(null);

  useEffect(() => {
    apiRef.current = createGrid(containerRef.current!, {
      theme: saTheme,
      ...options,
      rowData,
      columnDefs,
      loading,
    });
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // Created once; rowData, columnDefs and loading are pushed in by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.setGridOption('columnDefs', columnDefs);
  }, [columnDefs]);

  useEffect(() => {
    apiRef.current?.setGridOption('rowData', rowData);
  }, [rowData]);

  useEffect(() => {
    apiRef.current?.setGridOption('loading', loading);
  }, [loading]);

  return <div ref={containerRef} class={className} />;
}
