import { createContext, useContext, useState, useCallback, useEffect } from "react";

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

const SEED_REVIEWS: Review[] = [
  // Birthday Cakes
  {
    id: "r1", productId: "bc1", userId: "u_priya", userName: "Priya Sharma", userInitials: "PS",
    rating: 5, text: "Absolutely stunning cake! The vanilla sponge was so light and fluffy. My daughter's birthday was made extra special because of Whisk & Wonder. Will definitely order again!", date: "2024-11-15T10:30:00Z", likes: 12, likedBy: [], isVerified: true,
  },
  {
    id: "r2", productId: "bc1", userId: "u_rahul", userName: "Rahul Mehta", userInitials: "RM",
    rating: 4, text: "Great taste and presentation. The fondant decorations were beautiful. Only minor complaint is delivery was 20 minutes late, but the cake was worth the wait!", date: "2024-11-20T14:00:00Z", likes: 5, likedBy: [], isVerified: true,
  },
  {
    id: "r3", productId: "bc2", userId: "u_ananya", userName: "Ananya Singh", userInitials: "AS",
    rating: 5, text: "Ordered a custom theme cake for my son's 5th birthday. The team was so accommodating and the result was breathtaking. The kids couldn't stop talking about it!", date: "2024-10-28T09:15:00Z", likes: 18, likedBy: [], isVerified: true,
    ownerReply: "Thank you Ananya! It was our pleasure to create a special moment for your son. 🎂",
  },
  {
    id: "r4", productId: "bc3", userId: "u_vikram", userName: "Vikram Patel", userInitials: "VP",
    rating: 5, text: "The chocolate fudge birthday cake is hands down the best I've had in Bangalore. Rich, moist layers and the ganache frosting is to die for. Highly recommend!", date: "2024-12-01T16:45:00Z", likes: 22, likedBy: [], isVerified: true,
  },
  {
    id: "r5", productId: "bc4", userId: "u_sneha", userName: "Sneha Roy", userInitials: "SR",
    rating: 4, text: "Beautiful strawberry cake with fresh fruit toppings. Tasted as good as it looked. Packaging was excellent too — arrived perfectly intact. Would order again for sure.", date: "2024-11-05T11:20:00Z", likes: 8, likedBy: [], isVerified: false,
  },
  {
    id: "r6", productId: "bc5", userId: "u_arjun", userName: "Arjun Kumar", userInitials: "AK",
    rating: 3, text: "Decent cake, taste was good but I felt the portion was a bit small for the price. The piping work was neat though. Maybe next time I'll order a larger size.", date: "2024-10-10T13:00:00Z", likes: 2, likedBy: [], isVerified: true,
  },
  {
    id: "r7", productId: "bc6", userId: "u_meera", userName: "Meera Nair", userInitials: "MN",
    rating: 5, text: "Ordered a rainbow layered cake — each slice was a surprise of colour! The kids absolutely loved it. Cream cheese frosting was perfectly balanced, not too sweet.", date: "2024-09-22T15:30:00Z", likes: 30, likedBy: [], isVerified: true,
  },
  // Wedding Cakes
  {
    id: "r8", productId: "wc1", userId: "u_rohit", userName: "Rohit Gupta", userInitials: "RG",
    rating: 5, text: "Our wedding cake was a three-tier masterpiece. Every guest complimented the design and the taste — almond sponge with rose buttercream is a match made in heaven!", date: "2024-08-14T10:00:00Z", likes: 45, likedBy: [], isVerified: true,
    ownerReply: "Congratulations on your wedding Rohit! We were honoured to be part of your special day. 🌹",
  },
  {
    id: "r9", productId: "wc2", userId: "u_kavitha", userName: "Kavitha Iyer", userInitials: "KI",
    rating: 5, text: "Impeccable service from consultation to delivery. The cake was exactly as we envisioned with intricate floral sugar work. Our guests were wowed!", date: "2024-07-30T12:00:00Z", likes: 38, likedBy: [], isVerified: true,
  },
  {
    id: "r10", productId: "wc3", userId: "u_deepak", userName: "Deepak Sharma", userInitials: "DS",
    rating: 4, text: "Beautiful fondant work on our wedding cake. The lemon drizzle flavour was a refreshing choice and everyone loved it. A small dent in the transport but was fixed quickly.", date: "2024-06-18T09:30:00Z", likes: 14, likedBy: [], isVerified: true,
  },
  {
    id: "r11", productId: "wc4", userId: "u_nisha", userName: "Nisha Patel", userInitials: "NP",
    rating: 5, text: "They nailed our bohemian garden-themed wedding cake perfectly. The fresh flower arrangement on top was stunning. Tasted divine — mango and cardamom layers. 10/10!", date: "2024-05-25T14:30:00Z", likes: 52, likedBy: [], isVerified: true,
  },
  // Chocolate Cakes
  {
    id: "r12", productId: "cc1", userId: "u_sanjay", userName: "Sanjay Kumar", userInitials: "SK",
    rating: 5, text: "The triple chocolate cake is absolutely sinful. Three layers of different chocolate intensities — milk, dark, and white — with a silky smooth ganache. Pure heaven!", date: "2024-11-28T17:00:00Z", likes: 27, likedBy: [], isVerified: true,
  },
  {
    id: "r13", productId: "cc2", userId: "u_priya", userName: "Priya Sharma", userInitials: "PS",
    rating: 5, text: "Best chocolate cake in the city, period. The dark chocolate mousse filling is incredibly smooth and the sponge is moist without being dense. My go-to treat now!", date: "2024-12-03T11:45:00Z", likes: 19, likedBy: [], isVerified: true,
  },
  {
    id: "r14", productId: "cc3", userId: "u_ananya", userName: "Ananya Singh", userInitials: "AS",
    rating: 4, text: "Loved the hazelnut chocolate cake. The praline crunch in between layers adds such a nice texture contrast. Slightly on the richer side but that's what you'd expect!", date: "2024-11-10T16:20:00Z", likes: 11, likedBy: [], isVerified: false,
  },
  {
    id: "r15", productId: "cc4", userId: "u_vikram", userName: "Vikram Patel", userInitials: "VP",
    rating: 5, text: "The Belgian chocolate cake is a crowd-pleaser. Ordered it for an office party and 30 colleagues polished it off in minutes. High praise from everyone — quality is top-notch.", date: "2024-10-15T13:30:00Z", likes: 33, likedBy: [], isVerified: true,
  },
  // Cupcakes
  {
    id: "r16", productId: "cu1", userId: "u_sneha", userName: "Sneha Roy", userInitials: "SR",
    rating: 5, text: "Ordered 2 dozen assorted cupcakes for a baby shower. Each flavour was distinct and delicious. The rosette piping was gorgeous and stayed intact through the commute. Loved them!", date: "2024-11-22T10:00:00Z", likes: 16, likedBy: [], isVerified: true,
  },
  {
    id: "r17", productId: "cu2", userId: "u_arjun", userName: "Arjun Kumar", userInitials: "AK",
    rating: 4, text: "The red velvet cupcakes are fantastic! Cream cheese frosting is tangy and not overly sweet. Would be 5 stars if they were slightly bigger.", date: "2024-10-30T15:00:00Z", likes: 9, likedBy: [], isVerified: true,
  },
  {
    id: "r18", productId: "cu3", userId: "u_meera", userName: "Meera Nair", userInitials: "MN",
    rating: 5, text: "The lemon blueberry cupcakes are absolutely divine! That citrus burst with fresh blueberries on top — I've been dreaming about them since. Ordering again this weekend!", date: "2024-12-05T09:45:00Z", likes: 24, likedBy: [], isVerified: true,
    ownerReply: "We're so glad you loved them Meera! We'll keep a box ready for you 😊",
  },
  {
    id: "r19", productId: "cu4", userId: "u_rohit", userName: "Rohit Gupta", userInitials: "RG",
    rating: 3, text: "Cupcakes tasted good but the frosting had melted a bit on arrival. Probably a packaging issue on a hot day. The flavour itself — salted caramel — was excellent.", date: "2024-09-15T14:00:00Z", likes: 3, likedBy: [], isVerified: false,
  },
  // Donuts
  {
    id: "r20", productId: "d1", userId: "u_kavitha", userName: "Kavitha Iyer", userInitials: "KI",
    rating: 5, text: "These are proper gourmet donuts, not your average bakery variety. The matcha glaze one is unique and not too sweet. The classic glazed melts in your mouth. Brilliant!", date: "2024-11-18T08:30:00Z", likes: 21, likedBy: [], isVerified: true,
  },
  {
    id: "r21", productId: "d2", userId: "u_deepak", userName: "Deepak Sharma", userInitials: "DS",
    rating: 4, text: "Lovely fresh donuts. The Nutella-filled one was generously filled — not stingy at all like some other places. Slight critique: could be a touch lighter in the dough.", date: "2024-11-01T11:00:00Z", likes: 7, likedBy: [], isVerified: true,
  },
  {
    id: "r22", productId: "d3", userId: "u_nisha", userName: "Nisha Patel", userInitials: "NP",
    rating: 5, text: "The rose and pistachio donuts are a work of art! They look too pretty to eat but the taste is even better. Perfect for gifting. My friends were super impressed.", date: "2024-10-20T16:00:00Z", likes: 29, likedBy: [], isVerified: true,
  },
  {
    id: "r23", productId: "d4", userId: "u_sanjay", userName: "Sanjay Kumar", userInitials: "SK",
    rating: 5, text: "Got the churro donut on a whim and it's now my weekly addiction. Cinnamon sugar coating with a dulce de leche dip — absolutely outstanding. Worth every rupee!", date: "2024-12-02T10:15:00Z", likes: 17, likedBy: [], isVerified: true,
  },
  // Cookies
  {
    id: "r24", productId: "ck1", userId: "u_priya", userName: "Priya Sharma", userInitials: "PS",
    rating: 5, text: "The classic chocolate chip cookies are soft in the centre and have the perfect crisp edge. Baked fresh daily and it shows — they taste like home-made but better!", date: "2024-11-25T15:30:00Z", likes: 13, likedBy: [], isVerified: true,
  },
  {
    id: "r25", productId: "ck2", userId: "u_rahul", userName: "Rahul Mehta", userInitials: "RM",
    rating: 4, text: "Brown butter snickerdoodle cookies were a revelation. Never tried this flavour before and now I can't stop thinking about them. Slightly chewy with a lovely cinnamon kick.", date: "2024-10-25T13:00:00Z", likes: 10, likedBy: [], isVerified: false,
  },
  {
    id: "r26", productId: "ck3", userId: "u_ananya", userName: "Ananya Singh", userInitials: "AS",
    rating: 5, text: "The oatmeal raisin cookies are wholesome and delicious. My toddler approved and that's the highest compliment I can give! No artificial aftertaste at all.", date: "2024-09-30T10:30:00Z", likes: 6, likedBy: [], isVerified: true,
  },
  {
    id: "r27", productId: "ck4", userId: "u_vikram", userName: "Vikram Patel", userInitials: "VP",
    rating: 5, text: "Ordered the assorted cookie tin as a Diwali gift. Beautifully packaged and the variety was superb — everyone at the office had their favourite. Will re-order for every festive occasion!", date: "2024-11-08T09:00:00Z", likes: 35, likedBy: [], isVerified: true,
    ownerReply: "Thank you Vikram! Festive cookie tins are one of our favourites to put together. Happy gifting! 🪔",
  },
  {
    id: "r28", productId: "ck5", userId: "u_sneha", userName: "Sneha Roy", userInitials: "SR",
    rating: 4, text: "The double chocolate brownie cookies are incredibly indulgent. Fudgy, rich, and deeply chocolatey. Pairs perfectly with cold milk. My only wish — make them bigger!", date: "2024-12-06T17:00:00Z", likes: 20, likedBy: [], isVerified: true,
  },
  {
    id: "r29", productId: "ck6", userId: "u_meera", userName: "Meera Nair", userInitials: "MN",
    rating: 5, text: "Jam thumbprint cookies look adorable and taste even better. The buttery shortbread base with that sweet raspberry jam centre is a classic done right. Love Whisk & Wonder!", date: "2024-10-08T11:45:00Z", likes: 15, likedBy: [], isVerified: true,
  },
  {
    id: "r30", productId: "bc7", userId: "u_rohit", userName: "Rohit Gupta", userInitials: "RG",
    rating: 5, text: "Got the pinata cake for my nephew's birthday — the candy explosion was a massive hit! Kids went absolutely wild. The outer cake itself was delicious too. Brilliant concept!", date: "2024-11-30T14:30:00Z", likes: 40, likedBy: [], isVerified: true,
  },
  {
    id: "r31", productId: "wc5", userId: "u_kavitha", userName: "Kavitha Iyer", userInitials: "KI",
    rating: 5, text: "Five-tier wedding cake for 200 guests — handled flawlessly. Punctual delivery, professional setup, and the taste was universally praised. Thank you for making our dream wedding real!", date: "2024-04-12T08:00:00Z", likes: 61, likedBy: [], isVerified: true,
  },
  {
    id: "r32", productId: "cc5", userId: "u_deepak", userName: "Deepak Sharma", userInitials: "DS",
    rating: 5, text: "The molten lava chocolate cake is a restaurant-quality dessert at home. Perfectly gooey centre every single time. I've ordered it four times already and it never disappoints!", date: "2024-12-04T19:30:00Z", likes: 25, likedBy: [], isVerified: true,
  },
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch { /* ignore */ }
}

const Ctx = createContext<ReviewsCtx | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(loadReviews);

  useEffect(() => { saveReviews(reviews); }, [reviews]);

  const getProductReviews = useCallback(
    (productId: string) => reviews.filter(r => r.productId === productId && !r.isHidden),
    [reviews],
  );

  const getAllReviews = useCallback(() => reviews, [reviews]);

  const addReview = useCallback(
    (productId: string, review: Omit<Review, "id" | "date" | "likes" | "likedBy" | "productId">) => {
      const newReview: Review = {
        ...review,
        id: `r_${Date.now()}`,
        productId,
        date: new Date().toISOString(),
        likes: 0,
        likedBy: [],
      };
      setReviews(prev => [newReview, ...prev]);
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
          likedBy: alreadyLiked
            ? r.likedBy.filter(id => id !== userId)
            : [...r.likedBy, userId],
        };
      }),
    );
  }, []);

  const addOwnerReply = useCallback((reviewId: string, reply: string) => {
    setReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, ownerReply: reply } : r)),
    );
  }, []);

  const hideReview = useCallback((reviewId: string) => {
    setReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, isHidden: !r.isHidden } : r)),
    );
  }, []);

  const deleteReview = useCallback((reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  }, []);

  return (
    <Ctx.Provider
      value={{ getProductReviews, addReview, likeReview, addOwnerReply, hideReview, deleteReview, getAllReviews }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReviews must be inside ReviewsProvider");
  return ctx;
}
