import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { products as seedProducts, categories as seedCategories, type Product } from "../data/products";

const STORAGE_KEY = "ww_products_v1";

function load(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return seedProducts;
}

function save(products: Product[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch { /* ignore */ }
}

interface ProductStoreCtx {
  products:      Product[];
  categories:    string[];
  addProduct:    (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetToSeed:   () => void;
}

const Ctx = createContext<ProductStoreCtx | null>(null);

export function ProductStoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(load);

  useEffect(() => { save(products); }, [products]);

  const addProduct = useCallback((p: Omit<Product, "id">) => {
    const newProduct: Product = { ...p, id: `custom_${Date.now()}` };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const resetToSeed = useCallback(() => setProducts(seedProducts), []);

  const categories = Array.from(new Set([...seedCategories, ...products.map(p => p.category)]));

  return (
    <Ctx.Provider value={{ products, categories, addProduct, updateProduct, deleteProduct, resetToSeed }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProductStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProductStore must be used within ProductStoreProvider");
  return ctx;
}
