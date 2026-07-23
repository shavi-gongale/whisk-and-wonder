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
  imgId?: string;
  ownerReply?: string;
  isHidden?: boolean;
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

const STORAGE_KEY = "ww_reviews_v1";

// Compact seed reviews for initial state (no API yet on first render)
const SEED_REVIEWS: Review[] = [
  { id:"r1",  productId:"bc1", userId:"u_priya",  userName:"Priya Sharma",  userInitials:"PS", rating:5, text:"Absolutely stunning cake! The vanilla sponge was so light and fluffy. My daughter's birthday was made extra special!", date:"2024-11-15T10:30:00Z", likes:12, likedBy:[], isVerified:true },
  { id:"r2",  productId:"bc1", userId:"u_rahul",  userName:"Rahul Mehta",   userInitials:"RM", rating:4, text:"Great taste and presentation. The fondant decorations were beautiful. Only minor complaint is delivery was 20 minutes late, but the cake was worth the wait!", date:"2024-11-20T14:00:00Z", likes:5, likedBy:[], isVerified:true },
  { id:"r3",  productId:"bc2", userId:"u_ananya", userName:"Ananya Singh",  userInitials:"AS", rating:5, text:"Ordered a custom theme cake for my son's 5th birthday — breathtaking. The kids couldn't stop talking about it!", date:"2024-10-28T09:15:00Z", likes:18, likedBy:[], isVerified:true, ownerReply:"Thank you Ananya! It was our pleasure to create a special moment for your son. 🎂" },
  { id:"r4",  productId:"bc3", userId:"u_vikram", userName:"Vikram Patel",  userInitials:"VP", rating:5, text:"The chocolate fudge birthday cake is hands down the best I've had in Pune. Rich, moist layers and the ganache frosting is divine!", date:"2024-12-01T16:45:00Z", likes:22, likedBy:[], isVerified:true },
  { id:"r5",  productId:"wc1", userId:"u_rohit",  userName:"Rohit Gupta",   userInitials:"RG", rating:5, text:"Our wedding cake was a three-tier masterpiece. Every guest complimented the design and the taste — almond sponge with rose buttercream is heaven!", date:"2024-08-14T10:00:00Z", likes:45, likedBy:[], isVerified:true, ownerReply:"Congratulations on your wedding Rohit! We were honoured to be part of your special day. 🌹" },
  { id:"r6",  productId:"cc1", userId:"u_sanjay", userName:"Sanjay Kumar",  userInitials:"SK", rating:5, text:"The triple chocolate cake is absolutely sinful. Three layers of different chocolate intensities with a silky ganache. Pure heaven!", date:"2024-11-28T17:00:00Z", likes:27, likedBy:[], isVerified:true },
  { id:"r7",  productId:"cu1", userId:"u_sneha",  userName:"Sneha Roy",     userInitials:"SR", rating:5, text:"Ordered 2 dozen assorted cupcakes for a baby shower. Each flavour was distinct and delicious. The rosette piping was gorgeous!", date:"2024-11-22T10:00:00Z", likes:16, likedBy:[], isVerified:true },
  { id:"r8",  productId:"d1",  userId:"u_kavitha",userName:"Kavitha Iyer",  userInitials:"KI", rating:5, text:"These are proper gourmet donuts! The matcha glaze one is unique and not too sweet. The classic glazed melts in your mouth.", date:"2024-11-18T08:30:00Z", likes:21, likedBy:[], isVerified:true },
  { id:"r9",  productId:"ck4", userId:"u_vikram", userName:"Vikram Patel",  userInitials:"VP", rating:5, text:"Ordered the assorted cookie tin as a Diwali gift. Beautifully packaged and the variety was superb. Will re-order for every festive occasion!", date:"2024-11-08T09:00:00Z", likes:35, likedBy:[], isVerified:true, ownerReply:"Thank you Vikram! Festive cookie tins are one of our favourites to put together. Happy gifting! 🪔" },
  { id:"r10", productId:"bc7", userId:"u_rohit",  userName:"Rohit Gupta",   userInitials:"RG", rating:5, text:"Got the pinata cake for my nephew's birthday — the candy explosion was a massive hit! Kids went absolutely wild.", date:"2024-11-30T14:30:00Z", likes:40, likedBy:[], isVerified:true },
];

function loadReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_REVIEWS;
  } catch {
    return SEED_REVIEWS;
  }
}

function saveReviews(reviews: Review[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)); } catch {}
}

const Ctx = createContext<ReviewsCtx | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(loadReviews);

  useEffect(() => { saveReviews(reviews); }, [reviews]);

  // Fetch from backend and merge
  useEffect(() => {
    reviewsApi.getAll()
      .then(remote => {
        if (remote && remote.length > 0) {
          const mapped: Review[] = remote.map(r => ({
            ...r,
            likedBy: [],
            productId: r.productId || "",
          }));
          setReviews(prev => {
            const remoteIds = new Set(mapped.map(r => r.id));
            const localOnly = prev.filter(r => !remoteIds.has(r.id));
            return [...mapped, ...localOnly];
          });
        }
      })
      .catch(() => { /* keep local */ });
  }, []);

  const getProductReviews = useCallback(
    (productId: string) => reviews.filter(r => r.productId === productId && !r.isHidden),
    [reviews],
  );

  const getAllReviews = useCallback(() => reviews, [reviews]);

  const addReview = useCallback(
    (productId: string, review: Omit<Review, "id" | "date" | "likes" | "likedBy" | "productId">) => {
      const tempId = `r_${Date.now()}`;
      const newReview: Review = {
        ...review, id: tempId, productId, date: new Date().toISOString(), likes: 0, likedBy: [],
      };
      setReviews(prev => [newReview, ...prev]);
      // Persist
      reviewsApi.create({ productId, rating: review.rating, text: review.text, imgId: review.imgId })
        .then(saved => {
          setReviews(prev => prev.map(r => r.id === tempId
            ? { ...newReview, id: saved.id, isVerified: saved.isVerified }
            : r
          ));
        })
        .catch(() => {});
    },
    [],
  );

  const likeReview = useCallback((reviewId: string, userId: string) => {
    setReviews(prev =>
      prev.map(r => {
        if (r.id !== reviewId) return r;
        const alreadyLiked = r.likedBy.includes(userId);
        return {
          ...r,
          likes: alreadyLiked ? r.likes - 1 : r.likes + 1,
          likedBy: alreadyLiked ? r.likedBy.filter(id => id !== userId) : [...r.likedBy, userId],
        };
      }),
    );
    reviewsApi.markHelpful(reviewId).catch(() => {});
  }, []);

  const addOwnerReply = useCallback((reviewId: string, reply: string) => {
    setReviews(prev => prev.map(r => (r.id === reviewId ? { ...r, ownerReply: reply } : r)));
    reviewsApi.ownerPatch(reviewId, { ownerReply: reply }).catch(() => {});
  }, []);

  const hideReview = useCallback((reviewId: string) => {
    setReviews(prev => prev.map(r => (r.id === reviewId ? { ...r, isHidden: !r.isHidden } : r)));
    const rev = reviews.find(r => r.id === reviewId);
    if (rev) reviewsApi.ownerPatch(reviewId, { isHidden: !rev.isHidden }).catch(() => {});
  }, [reviews]);

  const deleteReview = useCallback((reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
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
