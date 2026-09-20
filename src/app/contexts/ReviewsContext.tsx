import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { reviewsApi } from "../../lib/api";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userInitials: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
  likedBy: string[];
  isVerified: boolean;
  verified?: boolean;
  imgId?: string;
  ownerReply?: string;
  isHidden?: boolean;
  hidden?: boolean;
}

interface ReviewsCtx {
  getProductReviews: (productId: string) => Review[];
  addReview: (productId: string, review: Omit<Review, "id" | "date" | "likes" | "likedBy" | "productId">) => void;
  likeReview: (reviewId: string, userId: string) => void;
  addOwnerReply: (reviewId: string, reply: string) => void;
  hideReview: (reviewId: string) => void;
  deleteReview: (reviewId: string) => void;
  getAllReviews: () => Review[];
}

const Ctx = createContext<ReviewsCtx | null>(null);

function mapReview(review: any): Review {
  return {
    ...review,
    productId: String(review.productId || ""),
    likedBy: [],
    isHidden: Boolean(review.isHidden),
    hidden: Boolean(review.isHidden),
    isVerified: Boolean(review.isVerified),
    verified: Boolean(review.isVerified),
  };
}

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  const refresh = useCallback(() => {
    reviewsApi.getAll().then(remote => setReviews(remote.map(mapReview))).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getProductReviews = useCallback(
    (productId: string) => reviews.filter(r => r.productId === productId && !r.isHidden),
    [reviews],
  );

  const getAllReviews = useCallback(() => reviews, [reviews]);

  const addReview = useCallback(
    (productId: string, review: Omit<Review, "id" | "date" | "likes" | "likedBy" | "productId">) => {
      reviewsApi.create({ productId, rating: review.rating, text: review.text, imgId: review.imgId })
        .then(saved => setReviews(prev => [mapReview(saved), ...prev]))
        .catch(() => {});
    },
    [],
  );

  const likeReview = useCallback((reviewId: string, _userId: string) => {
    reviewsApi.markHelpful(reviewId)
      .then(({ likes }) => setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes } : r)))
      .catch(() => {});
  }, []);

  const addOwnerReply = useCallback((reviewId: string, reply: string) => {
    reviewsApi.ownerPatch(reviewId, { ownerReply: reply })
      .then(saved => setReviews(prev => prev.map(r => r.id === reviewId ? mapReview(saved) : r)))
      .catch(() => {});
  }, []);

  const hideReview = useCallback((reviewId: string) => {
    const rev = reviews.find(r => r.id === reviewId);
    if (!rev) return;
    reviewsApi.ownerPatch(reviewId, { isHidden: !rev.isHidden })
      .then(saved => setReviews(prev => prev.map(r => r.id === reviewId ? mapReview(saved) : r)))
      .catch(() => {});
  }, [reviews]);

  const deleteReview = useCallback((reviewId: string) => {
    reviewsApi.remove(reviewId)
      .then(() => setReviews(prev => prev.filter(r => r.id !== reviewId)))
      .catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ getProductReviews, addReview, likeReview, addOwnerReply, hideReview, deleteReview, getAllReviews }}>
      {children}
    </Ctx.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReviews must be inside ReviewsProvider");
  return ctx;
}