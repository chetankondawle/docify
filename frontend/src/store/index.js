/**
 * Global Store
 *
 * This is the central entry point for state management.
 *
 * As the app grows, wire in your preferred solution here:
 *   - Redux Toolkit:  configure store and export { store, useAppDispatch, useAppSelector }
 *   - Zustand:        export individual stores
 *   - Jotai/Recoil:  export atoms
 *
 * For now this exports a lightweight React Context-based store.
 */

export { default as AppProvider, useAppContext } from './AppContext';
