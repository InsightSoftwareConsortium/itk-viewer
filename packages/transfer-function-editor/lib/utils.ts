// Make array of settable flags.  If any true, call func(true), else func(false)
export const createOrGates = (gatedFunc: (on: boolean) => void) => {
  const gates = [] as Array<boolean>;
  const updateFunc = () => {
    gatedFunc(gates.some((flag) => flag));
  };

  const createGate = () => {
    const index = gates.length;
    const setGuard = (isOn: boolean) => {
      gates[index] = isOn;
      updateFunc();
    };
    setGuard(false);
    return setGuard;
  };

  return createGate;
};
