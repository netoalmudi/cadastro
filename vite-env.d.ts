// Fixed: "Cannot find type definition file for 'vite/client'"
// The reference is commented out to resolve the build error as the type definition is missing.
// /// <reference types="vite/client" />

declare module '*.png' {
  const value: string;
  export default value;
}
