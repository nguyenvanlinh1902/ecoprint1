import { createContext, useContext, useReducer } from 'react';

// Initial state of the store
const initialState = {
  toast: {
    message: '',
    isError: false,
    open: false
  },
  user: null,
  isAuthenticated: false
};

// Action types
export const ACTION_TYPES = {
  SET_TOAST: 'SET_TOAST',
  CLEAR_TOAST: 'CLEAR_TOAST',
  SET_USER: 'SET_USER',
  LOGOUT: 'LOGOUT'
};

// Reducer function to handle state changes
function reducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_TOAST:
      return {
        ...state,
        toast: {
          message: action.payload.message,
          isError: !!action.payload.isError,
          open: true
        }
      };
    case ACTION_TYPES.CLEAR_TOAST:
      return {
        ...state,
        toast: {
          ...state.toast,
          open: false
        }
      };
    case ACTION_TYPES.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      };
    case ACTION_TYPES.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false
      };
    default:
      return state;
  }
}

// Create Context
const StoreContext = createContext();

// Store Provider component
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

// Custom hook to use the store
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export default {
  StoreProvider,
  useStore
}; 