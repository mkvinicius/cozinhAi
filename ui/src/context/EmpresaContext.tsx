import React, { createContext, useContext, useState } from "react";

type EmpresaContextValue = {
  empresaSlug: string | null;
  setEmpresaSlug: (slug: string | null) => void;
};

const EmpresaContext = createContext<EmpresaContextValue | null>(null);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresaSlug, setEmpresaSlug] = useState<string | null>(null);
  return (
    <EmpresaContext.Provider value={{ empresaSlug, setEmpresaSlug }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa deve ser usado dentro de EmpresaProvider");
  return ctx;
}
