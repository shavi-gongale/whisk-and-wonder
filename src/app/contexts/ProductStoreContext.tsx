import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { type Product } from "../data/products";
import { productsApi } from "../../lib/api";

interface ProductStoreCtx {
  products:      Product[];
  categories:    string[];
  isLoading:     boolean;
  addProduct:    (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetToSeed:   () => void;
}

const Ctx = createContext<ProductStoreCtx | null>(null);

export function ProductStoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // PostgreSQL is authoritative. Do not merge browser seed/local data into the catalog.
  useEffect(() => {
    setIsLoading(true);
    productsApi.getAll()
      .then(remote => setProducts(remote as unknown as Product[]))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, []);

  const addProduct = useCallback((p: Omit<Product, "id">) => {
    const tempId = `custom_${Date.now()}`;
    const newProduct: Product = { ...p, id: tempId };
    setProducts(prev => [newProduct, ...prev]);
    // Persist to backend
    productsApi.create(p as Parameters<typeof productsApi.create>[0])
      .then(saved => {
        setProducts(prev => prev.map(x => x.id === tempId ? saved as unknown as Product : x));
      })
      .catch(() => setProducts(prev => prev.filter(x => x.id !== tempId)));
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    productsApi.update(id, patch as Parameters<typeof productsApi.update>[1])
      .catch(() => productsApi.getAll().then(remote => setProducts(remote as unknown as Product[])));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    productsApi.remove(id).catch(() => productsApi.getAll().then(remote => setProducts(remote as unknown as Product[])));
  }, []);

  const resetToSeed = useCallback(() => {
    productsApi.getAll().then(remote => setProducts(remote as unknown as Product[])).catch(() => {});
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <Ctx.Provider value={{ products, categories, isLoading, addProduct, updateProduct, deleteProduct, resetToSeed }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProductStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProductStore must be used within ProductStoreProvider");
  return ctx;
}
