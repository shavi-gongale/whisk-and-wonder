import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { products as seedProducts, categories as seedCategories, type Product } from "../data/products";
import { productsApi } from "../../lib/api";

const STORAGE_KEY = "ww_products_v1";

function loadLocal(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return seedProducts;
}

function saveLocal(products: Product[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch {}
}

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
  const [products, setProducts] = useState<Product[]>(loadLocal);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { saveLocal(products); }, [products]);

  // Fetch from backend on mount; fall back to local if API unavailable
  useEffect(() => {
    setIsLoading(true);
    productsApi.getAll()
      .then(remote => {
        if (remote && remote.length > 0) {
          setProducts(remote as unknown as Product[]);
        }
      })
      .catch(() => { /* keep local */ })
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
      .catch(() => {});
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    productsApi.update(id, patch as Parameters<typeof productsApi.update>[1])
      .catch(() => {});
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    productsApi.remove(id).catch(() => {});
  }, []);

  const resetToSeed = useCallback(() => setProducts(seedProducts), []);

  const categories = Array.from(new Set([...seedCategories, ...products.map(p => p.category)]));

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
