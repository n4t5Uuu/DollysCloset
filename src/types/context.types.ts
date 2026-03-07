import { Product } from "./product.types";
import { CatalogStatus, ActivityLog } from "./logs.types";

export interface ProductContextType {
  productList: Product[];
  catalogStatus: { [key: string]: CatalogStatus };
  previousCatalogStatus: { [key: string]: "featured" | "standard" };
  activityLogs: ActivityLog[];
  addProduct: (product: Product, status: CatalogStatus) => void;
  updateProduct: (product: Product, status: CatalogStatus) => void;
  deleteProduct: (productId: string) => void;
  setCatalogStatus: (productId: string, status: CatalogStatus) => void;
  togglePublishStatus: (productId: string) => void;
  cycleCatalogStatus: (productId: string) => void;
  logActivity: (log: Omit<ActivityLog, "id" | "timestamp" | "actorId" | "actorEmail" | "actorRole">) => void;
}
