// For a module to be provided but whose exports shouldn't actually be invoked at runtime
export default {};

// satisfy commander import
export const Option = {};
export const createCommand = () => {
  void 0;
};
