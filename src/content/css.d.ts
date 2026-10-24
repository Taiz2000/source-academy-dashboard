// esbuild bundles .css imports as plain text (see loader in build.mjs).
declare module '*.css' {
  const text: string;
  export default text;
}
