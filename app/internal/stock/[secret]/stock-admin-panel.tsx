"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatOrderDate, formatOrderDateCompact } from "@/lib/format-order-date";
import { formatTakaFromCents } from "@/lib/format-taka";
import type { SerializedAdminOrder } from "@/lib/get-orders-for-admin";
import {
  DEFAULT_FOOTER_TAGLINE,
  type FooterBarPayload,
} from "@/lib/footer-bar-settings";
import { MAX_PRODUCT_GALLERY_IMAGES } from "@/lib/product-gallery-images";

const ORDER_STATUSES = [
  "NEW",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

type AdminTab =
  | "inventory"
  | "categories"
  | "blog"
  | "media"
  | "hero"
  | "footer"
  | "orders"
  | "session";

function defaultFooterBarForm(): FooterBarPayload {
  return {
    footerTagline: DEFAULT_FOOTER_TAGLINE,
    footerWhatsAppUrl: null,
    footerInstagramUrl: null,
    footerFacebookUrl: null,
    footerBarDisplayMode: "BOTH",
  };
}

type ListedListingCategory = {
  id: string;
  slug: string;
  label: string;
  listingTag: string;
  sortOrder: number;
  productCount: number;
};

type ListedUploadFile = {
  filename: string;
  publicUrl: string;
  sizeBytes: number;
  inUse: boolean;
};

type ListedBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string;
  sortOrder: number;
  updatedAt: string;
};

function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function orderCreatedAtMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Local calendar day start from `YYYY-MM-DD`. */
function parseDateFilterStartMs(yyyyMmDd: string): number | null {
  const s = yyyyMmDd.trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function parseDateFilterEndMs(yyyyMmDd: string): number | null {
  const s = yyyyMmDd.trim();
  if (!s) return null;
  const d = new Date(`${s}T23:59:59.999`);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function slugifyListingName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function generateRandomSkuCode(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const chunk = rand.slice(0, 6).padEnd(6, "X");
  return `SKU-${stamp}-${chunk}`;
}

function csvEscapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function ordersToCsvContent(ordersList: SerializedAdminOrder[]): string {
  const header = [
    "Order number",
    "Reference number",
    "Created (ISO)",
    "Status",
    "First name",
    "Last name",
    "Email",
    "Phone",
    "Ship line 1",
    "Ship line 2",
    "City",
    "Postal",
    "Country",
    "Instructions",
    "Subtotal (Tk)",
    "Shipping (Tk)",
    "Total (Tk)",
    "Items summary",
  ];
  const dataRows = ordersList.map((order) => {
    const itemsSummary = order.items
      .map(
        (item) =>
          `${item.productName} ×${item.quantity} @ Tk ${(item.unitPriceCents / 100).toFixed(2)}`,
      )
      .join(" | ");
    return [
      order.orderNumber,
      order.referenceNumber ?? order.orderNumber,
      order.createdAt,
      order.status,
      order.customerFirstName,
      order.customerLastName,
      order.customerEmail,
      order.customerPhone,
      order.shipLine1,
      order.shipLine2 ?? "",
      order.shipCity,
      order.shipPostal,
      order.shipCountry,
      order.instructions ?? "",
      (order.subtotalCents / 100).toFixed(2),
      (order.shippingCents / 100).toFixed(2),
      (order.totalCents / 100).toFixed(2),
      itemsSummary,
    ].map(String);
  });
  return [header, ...dataRows].map((row) => row.map(csvEscapeCell).join(",")).join("\r\n");
}

function downloadUtf8Csv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

const ORDERS_TAB_LAST_VISITED_LS = "watchh-admin-orders-tab-last-visited-ms";

function readOrdersTabLastVisitedMs(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(ORDERS_TAB_LAST_VISITED_LS);
  if (raw == null || raw === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function writeOrdersTabLastVisitedMs(timestampMs: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    ORDERS_TAB_LAST_VISITED_LS,
    String(timestampMs),
  );
}

/** Primary line item thumbnail + label for compact order rows. */
function summarizePrimaryProduct(order: SerializedAdminOrder): {
  imageUrl: string | null;
  label: string;
} {
  const items = order.items;
  if (items.length === 0) {
    return { imageUrl: null, label: "No line items" };
  }
  const first = items[0];
  const extra = items.length - 1;
  const label =
    extra > 0 ? `${first.productName} +${extra} more` : first.productName;
  return {
    imageUrl: first.imageUrl,
    label,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ListedVariationRow = {
  id: string;
  sku: string;
  label: string;
  sortOrder: number;
};

type ListedGalleryServerRow = {
  id: string;
  url: string;
  sortOrder: number;
};

type ListedProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  description?: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  listingCategoryId: string;
  listingCategory: { slug: string; label: string };
  listingCategoryLinks?: Array<{
    listingCategory: { id: string; slug: string; label: string };
  }>;
  badge: string;
  imageUrl: string;
  galleryImages?: ListedGalleryServerRow[];
  variations?: ListedVariationRow[];
};

function primaryListingThumb(product: ListedProduct): string {
  const imgs = product.galleryImages;
  if (imgs != null && imgs.length > 0) {
    return [...imgs].sort((a, b) => a.sortOrder - b.sortOrder)[0]!.url;
  }
  return product.imageUrl;
}

function formBadge(productBadge: string): "NONE" | "SALE" | "SOLD_OUT" {
  if (productBadge === "SALE" || productBadge === "SOLD_OUT") {
    return productBadge;
  }
  return "NONE";
}

type Props = {
  secret: string;
  initialAuthed: boolean;
  initialProducts: ListedProduct[];
  initialListingCategories: ListedListingCategory[];
  initialProductsLoadError?: string | null;
  initialOrders: SerializedAdminOrder[];
  initialOrdersLoadError?: string | null;
  initialHeroImages: string[];
  initialFooterBarSettings?: FooterBarPayload | null;
};

export function StockAdminPanel({
  secret,
  initialAuthed,
  initialProducts,
  initialListingCategories,
  initialProductsLoadError = null,
  initialOrders,
  initialOrdersLoadError = null,
  initialHeroImages,
  initialFooterBarSettings = null,
}: Props) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [adminTab, setAdminTab] = useState<AdminTab>("inventory");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [loadError, setLoadError] = useState<string | null>(
    initialProductsLoadError,
  );
  const [ordersError, setOrdersError] = useState<string | null>(
    initialOrdersLoadError,
  );
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [priceMajor, setPriceMajor] = useState("");
  const [compareMajor, setCompareMajor] = useState("");
  const [badge, setBadge] = useState<"NONE" | "SALE" | "SOLD_OUT">("NONE");
  const [listingCategories, setListingCategories] = useState<
    ListedListingCategory[]
  >(initialListingCategories);
  const [listingCategoryIds, setListingCategoryIds] = useState<string[]>(
    initialListingCategories[0]?.id ? [initialListingCategories[0].id] : [],
  );
  const [categoryFormSlug, setCategoryFormSlug] = useState("");
  const [categoryFormLabel, setCategoryFormLabel] = useState("");
  const [categoryFormTag, setCategoryFormTag] = useState("Category");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");
  const [categorySubmitMessage, setCategorySubmitMessage] = useState<
    string | null
  >(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<ListedUploadFile[]>([]);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [heroImages, setHeroImages] = useState<string[]>(initialHeroImages);
  const [heroSubmitMessage, setHeroSubmitMessage] = useState<string | null>(null);
  const [heroSaving, setHeroSaving] = useState(false);
  const [footerBarForm, setFooterBarForm] = useState<FooterBarPayload>(() =>
    initialFooterBarSettings ?? defaultFooterBarForm(),
  );
  const footerBarHydratedRef = useRef(initialFooterBarSettings != null);
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSubmitMessage, setFooterSubmitMessage] = useState<string | null>(
    null,
  );
  const [adminBlogPosts, setAdminBlogPosts] = useState<ListedBlogPost[]>([]);
  const [blogMessage, setBlogMessage] = useState<string | null>(null);
  const [blogSaving, setBlogSaving] = useState(false);
  const [editingBlogPostId, setEditingBlogPostId] = useState<string | null>(
    null,
  );
  const [blogSlug, setBlogSlug] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogImageUrl, setBlogImageUrl] = useState("");
  const [blogPublishedAt, setBlogPublishedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const blogCoverFileInputRef = useRef<HTMLInputElement>(null);
  const [blogMediaPickerOpen, setBlogMediaPickerOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [ordersDateFrom, setOrdersDateFrom] = useState("");
  const [ordersDateTo, setOrdersDateTo] = useState("");
  const [ordersTabLastVisitedMs, setOrdersTabLastVisitedMs] = useState<
    number | null
  >(null);
  const [showCurrentListings, setShowCurrentListings] = useState(false);
  const [listingSearchQuery, setListingSearchQuery] = useState("");
  const [variationRows, setVariationRows] = useState<
    Array<{
      rowKey: string;
      sku: string;
      label: string;
      sortOrder: string;
    }>
  >([]);
  const [galleryRows, setGalleryRows] = useState<
    Array<{ rowKey: string; url: string }>
  >([]);

  function newVariationRowKey(): string {
    if (
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
    return `var-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  const applyAutoSlugFromName = useCallback(() => {
    const generated = slugifyListingName(name);
    if (!generated) {
      setSubmitMessage("Type a display name first to generate slug.");
      return;
    }
    setSlug(generated);
    setSubmitMessage("Slug generated from display name.");
  }, [name]);

  const applyRandomSku = useCallback(() => {
    setSku(generateRandomSkuCode());
    setSubmitMessage("Random SKU generated.");
  }, []);

  const filteredProductsForPanel = useMemo(() => {
    const q = listingSearchQuery.trim().toLowerCase();
    if (q === "") {
      return products;
    }
    return products.filter((product) => {
      const vars = product.variations ?? [];
      const varHay = vars.map((v) => `${v.sku} ${v.label}`).join(" ");
      const categoryHay =
        product.listingCategoryLinks != null && product.listingCategoryLinks.length > 0
          ? product.listingCategoryLinks
              .map((row) => `${row.listingCategory.label} ${row.listingCategory.slug}`)
              .join(" ")
          : `${product.listingCategory.label} ${product.listingCategory.slug}`;
      const hay = [
        product.name,
        product.brand,
        product.sku,
        product.slug,
        categoryHay,
        varHay,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, listingSearchQuery]);

  const filteredOrders = useMemo(() => {
    const fromMs = parseDateFilterStartMs(ordersDateFrom);
    const toMs = parseDateFilterEndMs(ordersDateTo);
    return orders.filter((order) => {
      const t = orderCreatedAtMs(order.createdAt);
      if (fromMs !== null && t < fromMs) {
        return false;
      }
      if (toMs !== null && t > toMs) {
        return false;
      }
      return true;
    });
  }, [orders, ordersDateFrom, ordersDateTo]);

  useEffect(() => {
    if (
      expandedOrderId &&
      !filteredOrders.some((order) => order.id === expandedOrderId)
    ) {
      setExpandedOrderId(null);
    }
  }, [expandedOrderId, filteredOrders]);

  const seedOrdersTabVisitBaseline = useCallback(() => {
    let baseline = readOrdersTabLastVisitedMs();
    if (baseline === null) {
      baseline = Date.now();
      writeOrdersTabLastVisitedMs(baseline);
    }
    setOrdersTabLastVisitedMs(baseline);
  }, []);

  useEffect(() => {
    if (!authed) {
      return;
    }
    seedOrdersTabVisitBaseline();
  }, [authed, seedOrdersTabVisitBaseline]);

  useEffect(() => {
    if (!authed || footerBarHydratedRef.current) return;
    footerBarHydratedRef.current = true;
    void fetch("/api/admin/site-settings", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed");
        }
        return res.json() as Promise<{ settings?: FooterBarPayload }>;
      })
      .then((body) => {
        if (body.settings) {
          setFooterBarForm(body.settings);
        }
      })
      .catch(() => {});
  }, [authed]);

  const unseenOrdersCount = useMemo(() => {
    const ts = ordersTabLastVisitedMs;
    if (ts === null || orders.length === 0) {
      return 0;
    }
    let n = 0;
    for (const order of orders) {
      if (orderCreatedAtMs(order.createdAt) > ts) {
        n += 1;
      }
    }
    return n;
  }, [orders, ordersTabLastVisitedMs]);

  const ordersUnreadBadgeCount =
    adminTab !== "orders" ? unseenOrdersCount : 0;

  const activeListingCategoryIds = useMemo(() => {
    const valid = listingCategoryIds.filter((id) =>
      listingCategories.some((cat) => cat.id === id),
    );
    if (valid.length > 0) {
      return valid;
    }
    return listingCategories[0]?.id ? [listingCategories[0].id] : [];
  }, [listingCategoryIds, listingCategories]);

  const resetNewListingForm = useCallback(() => {
    const firstId =
      listingCategories[0]?.id ?? initialListingCategories[0]?.id ?? "";
    setEditingProductId(null);
    setSlug("");
    setName("");
    setBrand("");
    setSku("");
    setDescription("");
    setGalleryRows([]);
    setPriceMajor("");
    setCompareMajor("");
    setBadge("NONE");
    setListingCategoryIds(firstId ? [firstId] : []);
    setVariationRows([]);
  }, [listingCategories, initialListingCategories]);

  /** Clears inventory form without picking a category (used after sign-out). */
  const resetListingFieldsAfterLogout = useCallback(() => {
    setEditingProductId(null);
    setSlug("");
    setName("");
    setBrand("");
    setSku("");
    setDescription("");
    setGalleryRows([]);
    setPriceMajor("");
    setCompareMajor("");
    setBadge("NONE");
    setListingCategoryIds([]);
    setVariationRows([]);
  }, []);

  const beginEditListing = useCallback((product: ListedProduct) => {
    setEditingProductId(product.id);
    setSlug(product.slug);
    setName(product.name);
    setBrand(product.brand);
    setSku(product.sku);
    setDescription(product.description ?? "");
    const orderedGallery =
      product.galleryImages != null && product.galleryImages.length > 0
        ? [...product.galleryImages].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          )
        : [];
    setGalleryRows(
      orderedGallery.length > 0
        ? orderedGallery.map((img) => ({
            rowKey: img.id,
            url: img.url,
          }))
        : product.imageUrl
          ? [{ rowKey: newVariationRowKey(), url: product.imageUrl }]
          : [],
    );
    setPriceMajor((product.priceCents / 100).toString());
    setCompareMajor(
      product.compareAtPriceCents != null
        ? (product.compareAtPriceCents / 100).toString()
        : "",
    );
    setBadge(formBadge(product.badge));
    const selectedCategoryIds =
      product.listingCategoryLinks != null && product.listingCategoryLinks.length > 0
        ? product.listingCategoryLinks.map((row) => row.listingCategory.id)
        : product.listingCategoryId
          ? [product.listingCategoryId]
          : [];
    setListingCategoryIds(selectedCategoryIds);
    setVariationRows(
      (product.variations ?? []).map((v, i) => ({
        rowKey: v.id ?? `srv-${product.id}-${v.sku}-${i}`,
        sku: v.sku,
        label: v.label,
        sortOrder: String(Number.isFinite(v.sortOrder) ? v.sortOrder : i),
      })),
    );
    setSubmitMessage(null);
    setAdminTab("inventory");
  }, []);

  const loadUploads = useCallback(async () => {
    setUploadsLoading(true);
    setUploadsError(null);
    try {
      const response = await fetch("/api/admin/uploads", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { files: ListedUploadFile[] };
        setUploadFiles(data.files ?? []);
        setAuthed(true);
      } else if (response.status === 401) {
        setAuthed(false);
      } else {
        setUploadsError("Could not load uploads.");
      }
    } catch {
      setUploadsError("Could not load uploads.");
    } finally {
      setUploadsLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { products: ListedProduct[] };
        setProducts(data.products ?? []);
        setAuthed(true);
        setLoadError(null);
      } else if (response.status === 401) {
        setAuthed(false);
      } else {
        setLoadError("Could not load products.");
      }
    } catch {
      setLoadError("Could not load products.");
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as {
          orders: SerializedAdminOrder[];
        };
        const list = data.orders ?? [];
        setOrders(
          list.map((order) => ({
            ...order,
            createdAt:
              typeof order.createdAt === "string"
                ? order.createdAt
                : new Date(order.createdAt).toISOString(),
            updatedAt:
              typeof order.updatedAt === "string"
                ? order.updatedAt
                : new Date(order.updatedAt).toISOString(),
          })),
        );
        setAuthed(true);
        setOrdersError(null);
      } else if (response.status === 401) {
        setAuthed(false);
      } else {
        setOrdersError("Could not load orders.");
      }
    } catch {
      setOrdersError("Could not load orders.");
    }
  }, []);

  const loadListingCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/listing-categories", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as {
          categories: {
            id: string;
            slug: string;
            label: string;
            listingTag: string;
            sortOrder: number;
            _count: { products: number };
          }[];
        };
        const list = data.categories ?? [];
        setListingCategories(
          list.map((c) => ({
            id: c.id,
            slug: c.slug,
            label: c.label,
            listingTag: c.listingTag,
            sortOrder: c.sortOrder,
            productCount: c._count.products,
          })),
        );
        setAuthed(true);
      } else if (response.status === 401) {
        setAuthed(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadHeroImages = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/hero-images", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { images?: string[] };
        setHeroImages(Array.isArray(data.images) ? data.images : []);
        setAuthed(true);
      } else if (response.status === 401) {
        setAuthed(false);
      } else {
        setHeroSubmitMessage("Could not load hero images.");
      }
    } catch {
      setHeroSubmitMessage("Could not load hero images.");
    }
  }, []);

  const saveHeroImages = useCallback(async (next: string[]) => {
    setHeroSaving(true);
    setHeroSubmitMessage(null);
    try {
      const response = await fetch("/api/admin/hero-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ images: next }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        images?: string[];
        error?: string;
      };
      if (!response.ok) {
        setHeroSubmitMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not save hero images.",
        );
        return;
      }
      const normalized = Array.isArray(data.images) ? data.images : next;
      setHeroImages(normalized);
      setHeroSubmitMessage("Hero slides updated.");
    } catch {
      setHeroSubmitMessage("Could not save hero images.");
    } finally {
      setHeroSaving(false);
    }
  }, []);

  const saveFooterBarSettings = useCallback(async () => {
    setFooterSaving(true);
    setFooterSubmitMessage(null);
    try {
      const payload: FooterBarPayload = {
        ...footerBarForm,
        footerWhatsAppUrl:
          (footerBarForm.footerWhatsAppUrl ?? "").trim() || null,
        footerInstagramUrl:
          (footerBarForm.footerInstagramUrl ?? "").trim() || null,
        footerFacebookUrl:
          (footerBarForm.footerFacebookUrl ?? "").trim() || null,
      };

      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        settings?: FooterBarPayload;
        error?: string;
      };
      if (!response.ok) {
        setFooterSubmitMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not save header strip.",
        );
        return;
      }
      if (data.settings) {
        setFooterBarForm(data.settings);
      }
      setFooterSubmitMessage("Header strip updated.");
      setAuthed(true);
    } catch {
      setFooterSubmitMessage("Could not save header strip.");
    } finally {
      setFooterSaving(false);
    }
  }, [footerBarForm]);

  const loadBlogPosts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/blog-posts", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { posts?: ListedBlogPost[] };
        setAdminBlogPosts(Array.isArray(data.posts) ? data.posts : []);
        setAuthed(true);
        setBlogMessage(null);
      } else if (response.status === 401) {
        setAuthed(false);
      } else {
        setBlogMessage("Could not load blog posts.");
      }
    } catch {
      setBlogMessage("Could not load blog posts.");
    }
  }, []);

  const resetBlogForm = useCallback(() => {
    setEditingBlogPostId(null);
    setBlogSlug("");
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogImageUrl("");
    setBlogPublishedAt(new Date().toISOString().slice(0, 10));
    setBlogMessage(null);
    setBlogMediaPickerOpen(false);
  }, []);

  const handleSaveBlogPost = async (event: React.FormEvent) => {
    event.preventDefault();
    setBlogSaving(true);
    setBlogMessage(null);
    const imageUrlTrimmed = blogImageUrl.trim();
    if (!imageUrlTrimmed) {
      setBlogMessage("Upload a cover image or choose one from Media.");
      setBlogSaving(false);
      return;
    }
    try {
      const payload = {
        slug: blogSlug.trim().toLowerCase(),
        title: blogTitle.trim(),
        excerpt: blogExcerpt.trim(),
        imageUrl: imageUrlTrimmed,
        publishedAt: blogPublishedAt.trim(),
      };
      const url = editingBlogPostId
        ? `/api/admin/blog-posts/${editingBlogPostId}`
        : "/api/admin/blog-posts";
      const response = await fetch(url, {
        method: editingBlogPostId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setBlogMessage(
          typeof data.error === "string" ? data.error : "Could not save post.",
        );
        return;
      }
      resetBlogForm();
      setBlogMessage("Blog post saved. Homepage updates after revalidation.");
      await loadBlogPosts();
    } catch {
      setBlogMessage("Could not save post.");
    } finally {
      setBlogSaving(false);
    }
  };

  const handleDeleteBlogPost = async (post: ListedBlogPost) => {
    if (
      !globalThis.confirm(
        `Delete “${post.title}” from the blog? This removes the public page at /blog/${post.slug}.`,
      )
    ) {
      return;
    }
    setBlogMessage(null);
    try {
      const response = await fetch(`/api/admin/blog-posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setBlogMessage("Could not delete post.");
        return;
      }
      if (editingBlogPostId === post.id) {
        resetBlogForm();
      }
      await loadBlogPosts();
    } catch {
      setBlogMessage("Could not delete post.");
    }
  };

  const beginEditBlogPost = (post: ListedBlogPost) => {
    setEditingBlogPostId(post.id);
    setBlogSlug(post.slug);
    setBlogTitle(post.title);
    setBlogExcerpt(post.excerpt);
    setBlogImageUrl(post.imageUrl);
    setBlogPublishedAt(post.publishedAt.slice(0, 10));
    setBlogMessage(null);
    setBlogMediaPickerOpen(false);
  };

  const handleBlogFeaturedImageUpload = async (file: File) => {
    setBlogMessage(null);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      credentials: "include",
      body,
    });
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!response.ok) {
      setBlogMessage(data.error ?? "Image upload failed.");
      return;
    }
    if (data.url) {
      setBlogImageUrl(
        data.url.startsWith("/") ? data.url : `/${data.url}`,
      );
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginMessage(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      setPassword("");
      await Promise.all([
        loadProducts(),
        loadOrders(),
        loadUploads(),
        loadListingCategories(),
        loadHeroImages(),
        loadBlogPosts(),
      ]);
      return;
    }
    const body = await response.json().catch(() => ({}));
    setLoginMessage(body.error ?? "Login failed.");
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAuthed(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ORDERS_TAB_LAST_VISITED_LS);
    }
    setOrdersTabLastVisitedMs(null);
    setProducts([]);
    setOrders([]);
    setListingCategories([]);
    setHeroImages([]);
    setHeroSubmitMessage(null);
    setFooterBarForm(defaultFooterBarForm());
    footerBarHydratedRef.current = false;
    setFooterSubmitMessage(null);
    setAdminBlogPosts([]);
    resetBlogForm();
    setShowCurrentListings(false);
    setListingSearchQuery("");
    setAdminTab("inventory");
    resetListingFieldsAfterLogout();
  };

  const deleteListing = async (product: ListedProduct) => {
    if (
      !globalThis.confirm(
        `Remove “${product.name}” from the catalog? Existing orders keep a snapshot of the line item.`,
      )
    ) {
      return;
    }
    setSubmitMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not delete listing.",
        );
        return;
      }
      if (editingProductId === product.id) {
        resetNewListingForm();
      }
      await Promise.all([loadProducts(), loadUploads()]);
    } catch {
      setSubmitMessage("Could not delete listing.");
    }
  };

  const deleteUploadedFile = async (file: ListedUploadFile) => {
    if (file.inUse) {
      setUploadsError(
        "This file is still used by a listing. Remove or change the listing first.",
      );
      return;
    }
    if (
      !globalThis.confirm(
        "Delete this image from the server? This cannot be undone.",
      )
    ) {
      return;
    }
    setUploadsError(null);
    try {
      const response = await fetch("/api/admin/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: file.publicUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadsError(
          typeof data.error === "string" ? data.error : "Could not delete file.",
        );
        return;
      }
      await loadUploads();
    } catch {
      setUploadsError("Could not delete file.");
    }
  };

  const patchOrderStatus = async (orderId: string, status: string) => {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setOrdersError("Could not update status.");
      return;
    }
    setOrdersError(null);
    await loadOrders();
  };

  const deleteOrder = async (order: SerializedAdminOrder) => {
    if (
      !globalThis.confirm(
        `Permanently delete order #${order.orderNumber}? Customer and line-item data will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setOrdersError("Could not delete order.");
        return;
      }
      setOrdersError(null);
      await loadOrders();
    } catch {
      setOrdersError("Could not delete order.");
    }
  };

  const handleAddListingCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setCategorySubmitMessage(null);
    const rawSlug = categoryFormSlug.trim().toLowerCase();
    const label = categoryFormLabel.trim();
    const tag = categoryFormTag.trim() || "Category";
    if (!rawSlug || !label) {
      setCategorySubmitMessage("Enter a URL slug and a display label.");
      return;
    }
    try {
      const response = await fetch("/api/admin/listing-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: rawSlug,
          label,
          listingTag: tag,
          sortOrder: listingCategories.length,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: { fieldErrors?: Record<string, string[] | undefined> };
      };
      if (!response.ok) {
        const fieldEntries = data.details?.fieldErrors;
        const fromFields =
          fieldEntries && typeof fieldEntries === "object"
            ? Object.entries(fieldEntries)
                .map(([key, messages]) =>
                  Array.isArray(messages) && messages.length > 0
                    ? `${key}: ${messages.join("; ")}`
                    : "",
                )
                .filter(Boolean)
                .join(" · ")
            : "";
        setCategorySubmitMessage(
          fromFields ||
            (typeof data.error === "string" ? data.error : null) ||
            "Could not create category.",
        );
        return;
      }
      setCategorySubmitMessage("Category added. It appears in the main nav.");
      setCategoryFormSlug("");
      setCategoryFormLabel("");
      setCategoryFormTag("Category");
      await loadListingCategories();
    } catch {
      setCategorySubmitMessage("Could not create category.");
    }
  };

  const handleDeleteListingCategory = async (category: ListedListingCategory) => {
    if (category.productCount > 0) {
      return;
    }
    if (
      !globalThis.confirm(
        `Remove storefront collection “${category.label}” (${category.slug})?`,
      )
    ) {
      return;
    }
    setCategorySubmitMessage(null);
    try {
      const response = await fetch(
        `/api/admin/listing-categories/${category.id}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setCategorySubmitMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not remove category.",
        );
        return;
      }
      setCategorySubmitMessage("Category removed.");
      if (editingCategoryId === category.id) {
        setEditingCategoryId(null);
        setEditingCategoryLabel("");
      }
      await loadListingCategories();
    } catch {
      setCategorySubmitMessage("Could not remove category.");
    }
  };

  const beginEditListingCategory = (category: ListedListingCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryLabel(category.label);
    setCategorySubmitMessage(null);
  };

  const saveEditListingCategory = async (categoryId: string) => {
    const label = editingCategoryLabel.trim();
    if (!label) {
      setCategorySubmitMessage("Category name cannot be empty.");
      return;
    }
    setCategorySubmitMessage(null);
    try {
      const response = await fetch(`/api/admin/listing-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: { fieldErrors?: Record<string, string[] | undefined> };
      };
      if (!response.ok) {
        const fromFields =
          data.details?.fieldErrors && typeof data.details.fieldErrors === "object"
            ? Object.entries(data.details.fieldErrors)
                .map(([key, messages]) =>
                  Array.isArray(messages) && messages.length > 0
                    ? `${key}: ${messages.join("; ")}`
                    : "",
                )
                .filter(Boolean)
                .join(" · ")
            : "";
        setCategorySubmitMessage(
          fromFields ||
            (typeof data.error === "string" ? data.error : null) ||
            "Could not update category.",
        );
        return;
      }
      setCategorySubmitMessage("Category updated.");
      setEditingCategoryId(null);
      setEditingCategoryLabel("");
      await loadListingCategories();
    } catch {
      setCategorySubmitMessage("Could not update category.");
    }
  };

  const handleUpload = async (file: File) => {
    setSubmitMessage(null);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      credentials: "include",
      body,
    });
    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok) {
      setSubmitMessage(data.error ?? "Upload failed.");
      return;
    }
    if (data.url) {
      const normalized = data.url.startsWith("/")
        ? data.url
        : `/${data.url}`;
      setGalleryRows((prev) => {
        if (prev.length >= MAX_PRODUCT_GALLERY_IMAGES) {
          return prev;
        }
        if (prev.some((r) => r.url.trim() === normalized)) {
          return prev;
        }
        return [...prev, { rowKey: newVariationRowKey(), url: normalized }];
      });
      setSubmitMessage("Image uploaded.");
      loadUploads().catch(() => {
        /* Media tab will refresh when opened */
      });
    }
  };

  const setHeroAtSlot = useCallback(
    async (slotIndex: number, url: string) => {
      const next = [...heroImages];
      while (next.length < 5) {
        next.push("");
      }
      next[slotIndex] = url;
      await saveHeroImages(next.filter((s) => s.trim() !== ""));
    },
    [heroImages, saveHeroImages],
  );

  const removeHeroAtSlot = useCallback(
    async (slotIndex: number) => {
      const next = [...heroImages];
      next.splice(slotIndex, 1);
      await saveHeroImages(next);
    },
    [heroImages, saveHeroImages],
  );

  const handleHeroUpload = useCallback(
    async (file: File) => {
      setHeroSubmitMessage(null);
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok) {
        setHeroSubmitMessage(data.error ?? "Upload failed.");
        return;
      }
      if (!data.url) {
        setHeroSubmitMessage("Upload failed.");
        return;
      }
      const uploaded = data.url.startsWith("/") ? data.url : `/${data.url}`;
      const next = [...heroImages];
      if (next.length < 5) {
        next.push(uploaded);
      } else {
        next[4] = uploaded;
      }
      await saveHeroImages(next);
      loadUploads().catch(() => {
        /* refreshed later by media tab too */
      });
    },
    [heroImages, loadUploads, saveHeroImages],
  );

  const handleSaveListing = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitMessage(null);

    const trimmedGallery = galleryRows
      .map((row) => row.url.trim())
      .filter(Boolean);
    if (
      trimmedGallery.length === 0 ||
      trimmedGallery.length > MAX_PRODUCT_GALLERY_IMAGES
    ) {
      const message =
        trimmedGallery.length === 0
          ? editingProductId !== null
            ? "Listing must include at least one image (upload or URL)."
            : "Add at least one product image before saving."
          : `At most ${MAX_PRODUCT_GALLERY_IMAGES} images per listing.`;
      setSubmitMessage(message);
      return;
    }

    const invalidUrl = trimmedGallery.find(
      (u) =>
        !(
          u.startsWith("/uploads/") ||
          u.startsWith("https://") ||
          u.startsWith("http://")
        ),
    );
    if (invalidUrl) {
      setSubmitMessage(
        "Each image must be https, http, or under /uploads/ (hosted file).",
      );
      return;
    }

    const priceNumber = Number.parseFloat(priceMajor);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      setSubmitMessage("Enter a valid price.");
      return;
    }
    const priceCents = Math.round(priceNumber * 100);

    let comparePayload: number | "" = "";
    if (compareMajor.trim()) {
      const compareNumber = Number.parseFloat(compareMajor);
      if (!Number.isNaN(compareNumber) && compareNumber > 0) {
        comparePayload = Math.round(compareNumber * 100);
      }
    }

    const normalizedSlug = slug.trim().toLowerCase();

    if (activeListingCategoryIds.length === 0) {
      setSubmitMessage("Add at least one storefront category for this listing.");
      return;
    }

    const hasPartialVariation = variationRows.some((row) => {
      const s = row.sku.trim();
      const l = row.label.trim();
      return (s.length > 0 && l.length === 0) || (l.length > 0 && s.length === 0);
    });
    if (hasPartialVariation) {
      setSubmitMessage(
        "Each variation needs both a label (e.g. colour) and a unique SKU.",
      );
      return;
    }

    const trimmedVariations = variationRows
      .map((row, index) => ({
        sku: row.sku.trim(),
        label: row.label.trim(),
        sortOrder: Math.max(
          0,
          Number.parseInt(row.sortOrder.trim(), 10) || index,
        ),
      }))
      .filter((row) => row.sku.trim().length >= 1 && row.label.length > 0);

    const payload = {
      slug: normalizedSlug,
      name,
      brand,
      sku,
      description,
      galleryImages: trimmedGallery,
      priceCents,
      compareAtPriceCents: comparePayload === "" ? undefined : comparePayload,
      listingCategoryIds: activeListingCategoryIds,
      badge,
      variations: trimmedVariations,
    };

    const isEdit = editingProductId !== null;
    const response = await fetch(
      isEdit
        ? `/api/admin/products/${editingProductId}`
        : "/api/admin/products",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: {
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };
    if (!response.ok) {
      const fieldEntries = data.details?.fieldErrors;
      let fromFields = "";
      if (fieldEntries && typeof fieldEntries === "object") {
        fromFields = Object.entries(fieldEntries)
          .map(([key, messages]) =>
            Array.isArray(messages) && messages.length > 0
              ? `${key}: ${messages.join("; ")}`
              : "",
          )
          .filter(Boolean)
          .join(" · ");
      }
      setSubmitMessage(
        fromFields ||
          (typeof data.error === "string" ? data.error : null) ||
          `Could not ${isEdit ? "update" : "save"} listing.`,
      );
      return;
    }

    setSubmitMessage(isEdit ? "Listing updated." : "Product saved.");
    if (isEdit) {
      await Promise.all([loadProducts(), loadUploads()]);
      return;
    }

    resetNewListingForm();
    await Promise.all([loadProducts(), loadUploads()]);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-black/50">
        Secret route <span className="font-mono text-black">{secret}</span>
      </p>
      <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.08em]">
        Store admin
      </h1>

      {authed ? (
        <>
        <nav
          className="mt-8 flex flex-wrap gap-2"
          aria-label="Administrator sections"
        >
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "inventory"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => setAdminTab("inventory")}
            aria-pressed={adminTab === "inventory"}
          >
            Products
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "categories"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => {
              setAdminTab("categories");
              loadListingCategories().catch(() => {
                setCategorySubmitMessage("Could not load categories.");
              });
            }}
            aria-pressed={adminTab === "categories"}
          >
            Categories
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "blog"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => {
              setAdminTab("blog");
              loadBlogPosts().catch(() =>
                setBlogMessage("Could not load blog posts."),
              );
              loadUploads().catch(() => {});
            }}
            aria-pressed={adminTab === "blog"}
          >
            Blog
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "media"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => {
              setAdminTab("media");
              loadUploads().catch(() => setUploadsError("Could not load uploads."));
            }}
            aria-pressed={adminTab === "media"}
          >
            Media
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "hero"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => {
              setAdminTab("hero");
              loadUploads().catch(() => setUploadsError("Could not load uploads."));
              loadHeroImages().catch(() =>
                setHeroSubmitMessage("Could not load hero images."),
              );
            }}
            aria-pressed={adminTab === "hero"}
          >
            Hero
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "footer"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => setAdminTab("footer")}
            aria-pressed={adminTab === "footer"}
          >
            Header strip
          </button>
          <button
            type="button"
            className={`relative overflow-visible border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "orders"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => {
              const now = Date.now();
              writeOrdersTabLastVisitedMs(now);
              setOrdersTabLastVisitedMs(now);
              setAdminTab("orders");
            }}
            aria-pressed={adminTab === "orders"}
            aria-label={
              unseenOrdersCount > 0 && adminTab !== "orders"
                ? `Orders, ${unseenOrdersCount} new`
                : "Orders"
            }
          >
            Orders
            {ordersUnreadBadgeCount > 0 ? (
              <span
                className="absolute right-[-6px] top-[-6px] flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                aria-hidden
              >
                {ordersUnreadBadgeCount > 99 ? "99+" : ordersUnreadBadgeCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] ${
              adminTab === "session"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black hover:border-black"
            }`}
            onClick={() => setAdminTab("session")}
            aria-pressed={adminTab === "session"}
          >
            Session
          </button>
        </nav>
        {loadError ? (
          <p
            className="mt-8 border border-amber-200 bg-amber-50 p-4 text-sm text-black/85"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}
        </>
      ) : null}

      {authed === false ? (
        <div className="mt-10">
          <section
            aria-label="Administrator login"
            className="border border-gray-200 bg-white p-6"
          >
            {loadError ? (
              <p className="text-sm text-black/70">{loadError}</p>
            ) : null}
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="admin-password"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Administrator password
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black py-3 text-xs font-bold uppercase tracking-[0.24em] text-white"
              >
                Unlock panel
              </button>
              {loginMessage ? (
                <p className="text-sm text-black/65">{loginMessage}</p>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}

      {authed === true ? (
        <div className="mt-10 space-y-10">
        {adminTab === "session" ? (
          <section
            aria-label="Session"
            className="border border-gray-200 bg-white p-6"
          >
            <div className="space-y-4">
              <p className="text-sm font-medium text-black/80">
                You are signed in.
              </p>
              <button
                type="button"
                onClick={() => handleLogout()}
                className="w-full border border-black px-4 py-3 text-xs font-bold uppercase tracking-[0.24em]"
              >
                Log out
              </button>
              <div className="border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCurrentListings((v) => !v)}
                  className="w-full border border-gray-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:border-black"
                  aria-expanded={showCurrentListings}
                >
                  {showCurrentListings ? "Hide current listings" : "View current listings"}
                </button>
                {showCurrentListings ? (
                  <div className="mt-4 space-y-3">
                    <label
                      htmlFor="admin-current-listings-search"
                      className="sr-only"
                    >
                      Search current listings
                    </label>
                    <input
                      id="admin-current-listings-search"
                      type="search"
                      value={listingSearchQuery}
                      onChange={(e) => setListingSearchQuery(e.target.value)}
                      placeholder="Search by name, brand, SKU, slug, category…"
                      autoComplete="off"
                      className="w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      aria-label="Filter current listings"
                    />
                    {filteredProductsForPanel.length === 0 ? (
                      <p className="text-sm text-black/55" role="status">
                        {products.length === 0
                          ? "No listings in the catalog yet."
                          : "No listings match your search."}
                      </p>
                    ) : (
                  <ul className="max-h-[420px] space-y-3 overflow-auto pr-1">
                    {filteredProductsForPanel.map((product) => {
                      const thumbSrc = primaryListingThumb(product);
                      return (
                      <li
                        key={product.id}
                        className={`flex gap-3 border p-3 ${
                          editingProductId === product.id
                            ? "border-black bg-[#fafafa]"
                            : "border-gray-100"
                        }`}
                      >
                        <div className="relative h-16 w-16 shrink-0 border border-gray-200 bg-[#fafafa]">
                          <Image
                            src={thumbSrc}
                            alt={product.name}
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                            unoptimized={thumbSrc.startsWith("/uploads")}
                          />
                        </div>
                        <div className="min-w-0 flex-1 text-sm leading-snug">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-black/55">
                            {product.brand} · {product.sku}
                            {(product.variations?.length ?? 0) > 0 ? (
                              <span className="ml-1 text-[11px] font-normal lowercase text-black/45">
                                · {product.variations?.length ?? 0} variants
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-black/45">
                            {(product.listingCategoryLinks != null &&
                            product.listingCategoryLinks.length > 0
                              ? product.listingCategoryLinks.map(
                                  (row) =>
                                    `${row.listingCategory.label} (/${row.listingCategory.slug}/)`,
                                )
                              : [
                                  `${product.listingCategory.label} (/${product.listingCategory.slug}/)`,
                                ]).join(" · ")}
                          </div>
                          <div className="font-semibold">
                            {formatTakaFromCents(product.priceCents)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 self-center">
                          <button
                            type="button"
                            onClick={() => beginEditListing(product)}
                            className="border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] hover:border-black"
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteListing(product)}
                            className="border border-red-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-800 hover:border-red-400"
                            aria-label={`Remove listing ${product.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                    })}
                  </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {authed === true && adminTab === "orders" ? (
          <section
            aria-label="Customer orders"
            className="border border-gray-200 bg-white p-6"
          >
            {ordersError ? (
              <p className="mb-6 text-sm text-black/75">{ordersError}</p>
            ) : null}
            {orders.length === 0 ? (
              <p className="text-sm text-black/60">
                No orders yet. Customer checkouts appear here once the database is
                live and shoppers place orders from Buy Now.
              </p>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/55">
                      Filter by date (order placed)
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-black/50">
                        From
                        <input
                          type="date"
                          value={ordersDateFrom}
                          onChange={(event) =>
                            setOrdersDateFrom(event.target.value)
                          }
                          className="border border-gray-300 bg-white px-2 py-2 text-sm text-black"
                          aria-label="Orders from date"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-black/50">
                        To
                        <input
                          type="date"
                          value={ordersDateTo}
                          onChange={(event) =>
                            setOrdersDateTo(event.target.value)
                          }
                          className="border border-gray-300 bg-white px-2 py-2 text-sm text-black"
                          aria-label="Orders to date"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOrdersDateFrom("");
                          setOrdersDateTo("");
                        }}
                        className="mt-5 border border-gray-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black hover:border-black sm:mt-0"
                      >
                        Clear dates
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={filteredOrders.length === 0}
                    title={
                      filteredOrders.length === 0
                        ? "No orders match the current filters."
                        : "Download spreadsheet of filtered orders"
                    }
                    onClick={() => {
                      const stamp = new Date().toISOString().replace(/:/g, "-");
                      downloadUtf8Csv(
                        `watchphase-orders-${stamp}.csv`,
                        ordersToCsvContent(filteredOrders),
                      );
                    }}
                    className="border border-black bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-black/35"
                  >
                    Export CSV ({filteredOrders.length})
                  </button>
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-black/60">
                    No orders match the selected dates.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 bg-white">
                    {filteredOrders.map((order) => {
                      const expanded = expandedOrderId === order.id;
                      const statusLabel = order.status.replace(/_/g, " ");
                      const primaryProduct = summarizePrimaryProduct(order);
                      return (
                        <li key={order.id}>
                          <button
                            type="button"
                            id={`order-summary-${order.id}`}
                            aria-expanded={expanded}
                            aria-controls={`order-details-${order.id}`}
                            onClick={() =>
                              setExpandedOrderId(expanded ? null : order.id)
                            }
                            className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 text-left transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset sm:flex-nowrap sm:items-center sm:gap-x-4"
                          >
                            <span className="flex shrink-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-mono text-sm font-semibold">
                                #{order.orderNumber}
                              </span>
                              <span className="font-mono text-[11px] text-black/45">
                                Ref #{order.referenceNumber ?? order.orderNumber}
                              </span>
                              <span className="text-xs text-black/55">
                                {formatOrderDateCompact(order.createdAt)}
                              </span>
                            </span>
                            <span className="flex min-w-0 flex-[1_1_14rem] items-center gap-3 sm:min-w-[12rem] lg:max-w-md">
                              <div
                                className="relative h-12 w-12 shrink-0 overflow-hidden border border-gray-200 bg-white"
                                aria-hidden
                              >
                                {primaryProduct.imageUrl ? (
                                  <Image
                                    src={primaryProduct.imageUrl}
                                    alt=""
                                    fill
                                    sizes="48px"
                                    className="object-contain p-0.5"
                                    unoptimized={primaryProduct.imageUrl.startsWith(
                                      "/uploads",
                                    )}
                                  />
                                ) : (
                                  <span
                                    className="flex h-full items-center justify-center text-[10px] text-black/35"
                                    aria-hidden
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                              <span
                                className="min-w-0 flex-1 truncate text-sm font-medium text-black/90"
                                title={primaryProduct.label}
                              >
                                {primaryProduct.label}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-wrap items-center gap-3 sm:ml-auto sm:gap-4">
                              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/65">
                                {statusLabel}
                              </span>
                              <span className="tabular-nums text-sm font-semibold">
                                {formatTakaFromCents(order.totalCents)}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">
                                {expanded ? "Close" : "Open"}
                              </span>
                            </span>
                          </button>
                          {expanded ? (
                            <div
                              id={`order-details-${order.id}`}
                              role="region"
                              aria-labelledby={`order-summary-${order.id}`}
                              className="border-t border-gray-200 bg-[#fafafa] px-4 pb-6 pt-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                                <div>
                                  <p className="font-mono text-base font-semibold">
                                    #{order.orderNumber}
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-black/55">
                                    Ref #{order.referenceNumber ?? order.orderNumber}
                                  </p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-black/50">
                                    Placed{" "}
                                    {formatOrderDate(order.createdAt)}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                  <label
                                    htmlFor={`order-status-${order.id}`}
                                    className="sr-only"
                                  >
                                    Order status #{order.orderNumber}
                                  </label>
                                  <select
                                    id={`order-status-${order.id}`}
                                    value={order.status}
                                    aria-label={`Status for order ${order.orderNumber}`}
                                    className="border border-gray-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                    onChange={(event) =>
                                      patchOrderStatus(
                                        order.id,
                                        event.target.value,
                                      )
                                    }
                                  >
                                    {ORDER_STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {s.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => deleteOrder(order)}
                                    className="border border-red-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-800 hover:border-red-400"
                                    aria-label={`Delete order ${order.orderNumber}`}
                                  >
                                    Delete order
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-6 text-sm text-black/85 md:grid-cols-[1fr_auto]">
                                <div className="space-y-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                                    Customer
                                  </p>
                                  <p className="font-medium">
                                    {order.customerFirstName}{" "}
                                    {order.customerLastName}
                                  </p>
                                  <p className="text-black/65">
                                    {order.customerEmail}
                                  </p>
                                  <p className="text-black/65">
                                    {order.customerPhone}
                                  </p>
                                </div>
                                <div className="space-y-3 md:text-right md:min-w-[14rem]">
                                  <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                                    Ship to
                                  </p>
                                  <p>{order.shipLine1}</p>
                                  {order.shipLine2 ? (
                                    <p className="text-black/65">
                                      {order.shipLine2}
                                    </p>
                                  ) : null}
                                  <p>
                                    {order.shipCity} {order.shipPostal}
                                  </p>
                                  <p className="text-black/65">
                                    {order.shipCountry}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                                <p className="text-lg font-semibold tabular-nums">
                                  Total {formatTakaFromCents(order.totalCents)}
                                </p>
                              </div>

                              {order.instructions ? (
                                <p className="mt-4 rounded border border-dashed border-gray-200 bg-white p-4 text-sm text-black/70">
                                  <span className="text-xs uppercase tracking-[0.15em] text-black/45">
                                    Notes{" "}
                                  </span>
                                  {order.instructions}
                                </p>
                              ) : null}

                              <div className="mt-6">
                                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                                  Line items
                                </p>
                                <ul className="space-y-4">
                                  {order.items.map((item, lineIdx) => (
                                    <li
                                      key={`${order.id}-${lineIdx}-${item.sku}`}
                                      className="flex gap-4 border border-gray-100 bg-white p-3"
                                    >
                                      <div className="relative h-16 w-16 shrink-0 border border-gray-200 bg-white">
                                        <Image
                                          src={item.imageUrl}
                                          alt={item.productName}
                                          fill
                                          sizes="64px"
                                          className="object-contain p-1"
                                          unoptimized={item.imageUrl.startsWith(
                                            "/uploads",
                                          )}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium leading-snug">
                                          {item.productName}
                                        </p>
                                        <p className="mt-1 text-xs text-black/55">
                                          SKU {item.sku}{" "}
                                          <span className="text-black/35">
                                            ×
                                          </span>{" "}
                                          {item.quantity}
                                        </p>
                                        <p className="mt-2 text-sm font-semibold">
                                          {formatTakaFromCents(
                                            item.lineTotalCents,
                                          )}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        ) : null}

        {authed === true && adminTab === "categories" ? (
          <section
            aria-label="Storefront listing categories"
            className="border border-gray-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
              Storefront categories
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Each category becomes a collection page such as{" "}
              <span className="font-mono text-black/75">/mens-watch</span> and
              appears in the site header. Remove is only allowed when no products
              use the category.
            </p>
            {categorySubmitMessage ? (
              <p className="mt-4 text-sm text-black/70" role="status">
                {categorySubmitMessage}
              </p>
            ) : null}
            <form
              className="mt-6 grid gap-4 border border-gray-100 bg-[#fafafa] p-4 sm:grid-cols-2"
              onSubmit={handleAddListingCategory}
            >
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                  New category
                </p>
              </div>
              <div>
                <label
                  htmlFor="new-cat-slug"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  URL slug
                </label>
                <input
                  id="new-cat-slug"
                  value={categoryFormSlug}
                  onChange={(event) =>
                    setCategoryFormSlug(event.target.value.toLowerCase())
                  }
                  placeholder="e.g. dive-watches"
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  aria-label="Category URL slug"
                />
              </div>
              <div>
                <label
                  htmlFor="new-cat-label"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Listing title
                </label>
                <input
                  id="new-cat-label"
                  value={categoryFormLabel}
                  onChange={(event) => setCategoryFormLabel(event.target.value)}
                  placeholder="Shown as H1 on the collection page"
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  aria-label="Category listing title"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="new-cat-tag"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Eyebrow label
                </label>
                <input
                  id="new-cat-tag"
                  value={categoryFormTag}
                  onChange={(event) => setCategoryFormTag(event.target.value)}
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  aria-label="Category eyebrow label"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white"
                >
                  Add category
                </button>
              </div>
            </form>
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                Current categories
              </p>
              {listingCategories.length === 0 ? (
                <p className="mt-3 text-sm text-black/60">
                  No categories yet. Add one above or run{" "}
                  <span className="font-mono text-black/75">npx prisma db seed</span>
                  .
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-gray-100 border border-gray-100">
                  {listingCategories.map((category) => (
                    <li
                      key={category.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        {editingCategoryId === category.id ? (
                          <div className="max-w-md">
                            <label
                              htmlFor={`edit-cat-${category.id}`}
                              className="text-[10px] uppercase tracking-[0.15em] text-black/55"
                            >
                              Category name
                            </label>
                            <input
                              id={`edit-cat-${category.id}`}
                              value={editingCategoryLabel}
                              onChange={(event) =>
                                setEditingCategoryLabel(event.target.value)
                              }
                              className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                              aria-label={`Edit category name for ${category.slug}`}
                            />
                          </div>
                        ) : (
                          <p className="font-medium">{category.label}</p>
                        )}
                        <p className="mt-1 text-xs text-black/55">
                          <span className="font-mono">/{category.slug}/</span> ·{" "}
                          {category.productCount} product
                          {category.productCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingCategoryId === category.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEditListingCategory(category.id)}
                              className="border border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-white hover:text-black"
                              aria-label={`Save category name for ${category.slug}`}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryLabel("");
                                setCategorySubmitMessage(null);
                              }}
                              className="border border-gray-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] hover:border-black"
                              aria-label={`Cancel editing category ${category.slug}`}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEditListingCategory(category)}
                              className="border border-gray-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] hover:border-black"
                              aria-label={`Edit category ${category.label}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={category.productCount > 0}
                              onClick={() => handleDeleteListingCategory(category)}
                              className="border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-800 hover:border-red-400 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-black/30"
                              aria-label={`Remove category ${category.label}`}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {authed === true && adminTab === "blog" ? (
          <section
            aria-label="Homepage blog posts"
            className="border border-gray-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
              Blog posts
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Posts appear on the homepage under “Blog Posts” and at{" "}
              <span className="font-mono text-black/75">/blog/your-slug</span>. Use a
              unique URL slug (lowercase, hyphens).
            </p>
            {blogMessage ? (
              <p className="mt-4 text-sm text-black/70" role="status">
                {blogMessage}
              </p>
            ) : null}

            <form
              className="mt-6 space-y-4 border border-gray-100 bg-[#fafafa] p-4"
              onSubmit={handleSaveBlogPost}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                {editingBlogPostId ? "Edit post" : "New post"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="blog-title"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Title
                  </label>
                  <input
                    id="blog-title"
                    value={blogTitle}
                    onChange={(event) => setBlogTitle(event.target.value)}
                    className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                    maxLength={200}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    htmlFor="blog-slug"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    URL slug
                  </label>
                  <input
                    id="blog-slug"
                    value={blogSlug}
                    onChange={(event) =>
                      setBlogSlug(event.target.value.toLowerCase())
                    }
                    className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 font-mono text-sm"
                    required
                    maxLength={120}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    title="Lowercase letters, numbers, single hyphens"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="mt-2 border border-gray-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black"
                    onClick={() => {
                      if (blogTitle.trim()) {
                        setBlogSlug(slugifyBlogTitle(blogTitle));
                      }
                    }}
                    aria-label="Generate URL slug from title"
                  >
                    From title
                  </button>
                </div>
                <div>
                  <label
                    htmlFor="blog-published"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Published date
                  </label>
                  <input
                    id="blog-published"
                    type="date"
                    value={blogPublishedAt}
                    onChange={(event) =>
                      setBlogPublishedAt(event.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="blog-excerpt"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Excerpt (shown on homepage and article page)
                  </label>
                  <textarea
                    id="blog-excerpt"
                    value={blogExcerpt}
                    onChange={(event) => setBlogExcerpt(event.target.value)}
                    rows={5}
                    className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                    maxLength={8000}
                  />
                </div>
                <div className="sm:col-span-2 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-black/60">
                      Featured cover image
                    </p>
                    {blogImageUrl ? (
                      <div className="mt-3 flex flex-wrap items-start gap-4">
                        <div className="relative h-[100px] w-[160px] shrink-0 overflow-hidden border border-gray-200 bg-white">
                          <Image
                            src={blogImageUrl}
                            alt=""
                            fill
                            sizes="160px"
                            className="object-cover"
                            unoptimized={blogImageUrl.startsWith("/uploads")}
                          />
                        </div>
                        <button
                          type="button"
                          className="border border-gray-300 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black"
                          onClick={() => setBlogImageUrl("")}
                        >
                          Clear image
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-black/55">
                        Upload a new file or choose an existing library image.
                      </p>
                    )}
                    <input
                      ref={blogCoverFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Select image file for blog cover"
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          handleBlogFeaturedImageUpload(file).catch(() =>
                            setBlogMessage("Upload failed."),
                          );
                        }
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="border border-black bg-black px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black"
                        onClick={() => blogCoverFileInputRef.current?.click()}
                      >
                        Upload picture
                      </button>
                      <button
                        type="button"
                        aria-expanded={blogMediaPickerOpen}
                        aria-controls="blog-media-picker-panel"
                        className={`border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                          blogMediaPickerOpen
                            ? "border-black bg-black text-white hover:bg-white hover:text-black"
                            : "border-gray-400 bg-white text-black hover:border-black"
                        }`}
                        onClick={() => {
                          setBlogMediaPickerOpen((open) => !open);
                          loadUploads().catch(() =>
                            setBlogMessage("Could not load Media."),
                          );
                        }}
                      >
                        {blogMediaPickerOpen
                          ? "Hide media"
                          : "Choose from media"}
                      </button>
                    </div>
                  </div>

                  {blogMediaPickerOpen ? (
                  <div
                    id="blog-media-picker-panel"
                    role="region"
                    aria-label="Choose image from uploads library"
                    className="border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
                        Uploads library
                      </p>
                      <button
                        type="button"
                        className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/60 underline decoration-black/25 underline-offset-2 hover:text-black"
                        onClick={() =>
                          loadUploads().catch(() =>
                            setBlogMessage("Could not refresh Media."),
                          )
                        }
                      >
                        Refresh list
                      </button>
                    </div>
                    {uploadsLoading ? (
                      <p className="mt-4 text-sm text-black/55">Loading media…</p>
                    ) : uploadFiles.length === 0 ? (
                      <p className="mt-4 text-sm text-black/55">
                        No files yet. Open the Media tab and upload images, then
                        return here and refresh the list — or use{" "}
                        <span className="font-semibold">Upload picture</span>{" "}
                        above.
                      </p>
                    ) : (
                      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {uploadFiles.map((file) => {
                          const picked = blogImageUrl === file.publicUrl;
                          return (
                            <li
                              key={file.publicUrl}
                              className={`border bg-[#fafafa] p-2 ${
                                picked
                                  ? "border-black ring-1 ring-black"
                                  : "border-gray-100"
                              }`}
                            >
                              <div className="relative aspect-[16/10] border border-gray-200 bg-white">
                                <Image
                                  src={file.publicUrl}
                                  alt=""
                                  fill
                                  sizes="120px"
                                  className="object-cover"
                                  unoptimized={file.publicUrl.startsWith(
                                    "/uploads",
                                  )}
                                />
                              </div>
                              <p className="mt-2 line-clamp-2 break-all font-mono text-[9px] text-black/55">
                                {file.filename}
                              </p>
                              <button
                                type="button"
                                className="mt-2 w-full border border-gray-300 bg-white py-2 text-[10px] font-bold uppercase tracking-[0.1em] hover:border-black"
                                onClick={() =>
                                  setBlogImageUrl(file.publicUrl)
                                }
                                aria-label={`Use ${file.filename} as blog cover`}
                                aria-pressed={picked}
                              >
                                Use this image
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={blogSaving}
                  className="border border-black bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-black/40"
                >
                  {editingBlogPostId ? "Update post" : "Publish post"}
                </button>
                {editingBlogPostId ? (
                  <button
                    type="button"
                    disabled={blogSaving}
                    className="border border-gray-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] hover:border-black"
                    onClick={resetBlogForm}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-10 border-t border-gray-200 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                Existing posts ({adminBlogPosts.length})
              </h3>
              {adminBlogPosts.length === 0 ? (
                <p className="mt-3 text-sm text-black/55">No posts yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {adminBlogPosts.map((post) => (
                    <li
                      key={post.id}
                      className="flex flex-wrap items-start justify-between gap-3 border border-gray-100 bg-[#fafafa] p-4"
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div
                          className="relative h-16 w-16 shrink-0 overflow-hidden border border-gray-200 bg-white"
                          aria-hidden
                        >
                          <Image
                            src={post.imageUrl}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                            unoptimized={post.imageUrl.startsWith(
                              "/uploads",
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{post.title}</p>
                          <p className="mt-1 font-mono text-[11px] text-black/55">
                            /blog/{post.slug}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-black/45">
                            {formatOrderDateCompact(post.publishedAt)} · Updated{" "}
                            {formatOrderDateCompact(post.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEditBlogPost(post)}
                          className="border border-gray-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteBlogPost(post).catch(() =>
                              setBlogMessage("Could not delete post."),
                            )
                          }
                          className="border border-red-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-red-800 hover:border-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="mt-6 border border-gray-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:border-black"
              onClick={() =>
                loadBlogPosts().catch(() =>
                  setBlogMessage("Could not load blog posts."),
                )
              }
            >
              Refresh list
            </button>
          </section>
        ) : null}

        {authed === true && adminTab === "media" ? (
          <section
            aria-label="Uploaded product images"
            className="border border-gray-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
              Uploaded images
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Files saved under{" "}
              <span className="font-mono text-black/75">/uploads/products</span>.
              Delete is blocked while a listing still uses the image URL.
            </p>
            {uploadsError ? (
              <p className="mt-4 text-sm text-red-900/85" role="alert">
                {uploadsError}
              </p>
            ) : null}
            {uploadsLoading ? (
              <p className="mt-6 text-sm text-black/55">Loading…</p>
            ) : uploadFiles.length === 0 ? (
              <p className="mt-6 text-sm text-black/60">No uploaded files yet.</p>
            ) : (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {uploadFiles.map((file) => (
                  <li
                    key={file.publicUrl}
                    className="flex flex-col border border-gray-100 bg-[#fafafa] p-4"
                  >
                    <div className="relative mx-auto aspect-square w-full max-w-[220px] border border-gray-200 bg-white">
                      <Image
                        src={file.publicUrl}
                        alt={`Preview ${file.filename}`}
                        fill
                        sizes="220px"
                        className="object-contain p-2"
                        unoptimized={file.publicUrl.startsWith("/uploads")}
                      />
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-black/70">
                      {file.filename}
                    </p>
                    <p className="mt-1 text-xs text-black/50">
                      {formatFileSize(file.sizeBytes)}
                      {file.inUse ? (
                        <span className="ml-2 font-semibold uppercase tracking-wider text-black/55">
                          · In use
                        </span>
                      ) : (
                        <span className="ml-2 text-black/40">· Not in use</span>
                      )}
                    </p>
                    <button
                      type="button"
                      disabled={file.inUse}
                      onClick={() => deleteUploadedFile(file)}
                      className="mt-4 w-full border border-red-200 bg-white py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-800 hover:border-red-400 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-black/30"
                      aria-label={`Delete file ${file.filename}`}
                    >
                      Delete file
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-6 border border-gray-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:border-black"
              onClick={() =>
                loadUploads().catch(() =>
                  setUploadsError("Could not load uploads."),
                )
              }
            >
              Refresh list
            </button>
          </section>
        ) : null}

        {authed === true && adminTab === "hero" ? (
          <section
            aria-label="Homepage hero slideshow images"
            className="border border-gray-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
              Homepage hero slides
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Upload and arrange 5 images for the homepage hero carousel.
            </p>

            <div className="mt-6 space-y-3">
              <label className="text-xs uppercase tracking-[0.2em] text-black/60">
                Upload new hero image
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload homepage hero image"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleHeroUpload(file).catch(() =>
                      setHeroSubmitMessage("Upload failed."),
                    );
                  }
                }}
                className="text-sm text-black"
              />
            </div>

            {heroSubmitMessage ? (
              <p className="mt-4 text-sm text-black/70" role="status">
                {heroSubmitMessage}
              </p>
            ) : null}

            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 5 }, (_, slotIdx) => {
                const img = heroImages[slotIdx] ?? "";
                return (
                  <li
                    key={`hero-slot-${slotIdx}`}
                    className="border border-gray-100 bg-[#fafafa] p-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/60">
                      Slide {slotIdx + 1}
                    </p>
                    <div className="relative mt-2 aspect-[16/10] border border-gray-200 bg-white">
                      {img ? (
                        <Image
                          src={img}
                          alt={`Hero slide ${slotIdx + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 300px"
                          className="object-cover"
                          unoptimized={img.startsWith("/uploads")}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.12em] text-black/35">
                          Empty slot
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!img || heroSaving}
                        onClick={() =>
                          removeHeroAtSlot(slotIdx).catch(() =>
                            setHeroSubmitMessage("Could not remove slide."),
                          )
                        }
                        className="border border-red-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-red-800 hover:border-red-400 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-black/30"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 border-t border-gray-200 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                Use existing uploads
              </p>
              <p className="mt-2 text-xs text-black/55">
                Pick any uploaded image and assign it to a slide slot.
              </p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {uploadFiles.map((file) => (
                  <li
                    key={`hero-pick-${file.publicUrl}`}
                    className="border border-gray-100 bg-white p-3"
                  >
                    <div className="relative aspect-[16/10] border border-gray-200 bg-[#fafafa]">
                      <Image
                        src={file.publicUrl}
                        alt={file.filename}
                        fill
                        sizes="300px"
                        className="object-cover"
                        unoptimized={file.publicUrl.startsWith("/uploads")}
                      />
                    </div>
                    <p className="mt-2 line-clamp-1 break-all font-mono text-[10px] text-black/60">
                      {file.filename}
                    </p>
                    <div className="mt-2 grid grid-cols-5 gap-1">
                      {Array.from({ length: 5 }, (_, slotIdx) => (
                        <button
                          key={`assign-${file.publicUrl}-${slotIdx}`}
                          type="button"
                          disabled={heroSaving}
                          onClick={() =>
                            setHeroAtSlot(slotIdx, file.publicUrl).catch(() =>
                              setHeroSubmitMessage("Could not assign slide."),
                            )
                          }
                          className="border border-gray-300 px-1 py-1 text-[10px] font-bold uppercase tracking-[0.08em] hover:border-black disabled:cursor-not-allowed"
                          aria-label={`Set slide ${slotIdx + 1} to ${file.filename}`}
                        >
                          {slotIdx + 1}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {authed === true && adminTab === "footer" ? (
          <section
            aria-label="Header tagline and social links"
            className="border border-gray-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
              Header strip
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Top-of-site strip under the slim black accent — tagline and
              WhatsApp / Instagram / Facebook icons (shown on every page above
              the logo).
            </p>
            <p className="mt-2 text-xs text-black/50">
              Leave a URL blank to use the matching{" "}
              <span className="font-mono">NEXT_PUBLIC_SOCIAL_*</span> value from
              .env when set.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="footer-tagline"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Tagline text
                </label>
                <textarea
                  id="footer-tagline"
                  value={footerBarForm.footerTagline}
                  onChange={(e) =>
                    setFooterBarForm((f) => ({
                      ...f,
                      footerTagline: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-y border border-gray-300 px-4 py-3 text-sm uppercase tracking-[0.12em] text-black outline-none focus:border-black"
                  aria-describedby="footer-tagline-hint"
                />
                <p id="footer-tagline-hint" className="mt-2 text-[11px] text-black/50">
                  Shown unless you choose icons only below. Clearing this hides
                  the line when icons are shown elsewhere.
                </p>
              </div>

              <fieldset className="space-y-2 border border-gray-100 p-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-black/65">
                  What to display
                </legend>
                {(
                  [
                    ["TEXT_ONLY", "Text only"],
                    ["ICONS_ONLY", "Icons only"],
                    ["BOTH", "Text and icons"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 text-sm text-black"
                  >
                    <input
                      type="radio"
                      name="footer-display-mode"
                      checked={footerBarForm.footerBarDisplayMode === value}
                      onChange={() =>
                        setFooterBarForm((f) => ({
                          ...f,
                          footerBarDisplayMode: value,
                        }))
                      }
                      className="h-4 w-4 shrink-0 border-gray-400 text-black accent-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>

              <div className="space-y-3">
                <label
                  htmlFor="footer-url-whatsapp"
                  className="text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  WhatsApp URL
                </label>
                <input
                  id="footer-url-whatsapp"
                  type="url"
                  value={footerBarForm.footerWhatsAppUrl ?? ""}
                  onChange={(e) =>
                    setFooterBarForm((f) => ({
                      ...f,
                      footerWhatsAppUrl:
                        e.target.value.trim() === "" ? null : e.target.value,
                    }))
                  }
                  placeholder="https://wa.me/"
                  autoComplete="off"
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />

                <label
                  htmlFor="footer-url-instagram"
                  className="mt-6 block text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Instagram URL
                </label>
                <input
                  id="footer-url-instagram"
                  type="url"
                  value={footerBarForm.footerInstagramUrl ?? ""}
                  onChange={(e) =>
                    setFooterBarForm((f) => ({
                      ...f,
                      footerInstagramUrl:
                        e.target.value.trim() === "" ? null : e.target.value,
                    }))
                  }
                  placeholder="https://instagram.com/"
                  autoComplete="off"
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />

                <label
                  htmlFor="footer-url-facebook"
                  className="mt-6 block text-xs uppercase tracking-[0.2em] text-black/60"
                >
                  Facebook URL
                </label>
                <input
                  id="footer-url-facebook"
                  type="url"
                  value={footerBarForm.footerFacebookUrl ?? ""}
                  onChange={(e) =>
                    setFooterBarForm((f) => ({
                      ...f,
                      footerFacebookUrl:
                        e.target.value.trim() === "" ? null : e.target.value,
                    }))
                  }
                  placeholder="https://facebook.com/"
                  autoComplete="off"
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  saveFooterBarSettings().catch(() =>
                    setFooterSubmitMessage("Could not save header strip."),
                  )
                }
                disabled={footerSaving}
                className="w-full bg-black py-4 text-xs font-bold uppercase tracking-[0.26em] text-white disabled:cursor-not-allowed disabled:bg-black/40"
              >
                Save header strip
              </button>
              {footerSubmitMessage ? (
                <p className="text-sm text-black/70" role="status">
                  {footerSubmitMessage}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {authed === true && adminTab === "inventory" ? (
          <section aria-label="Add or edit product">
            <form
              className="space-y-5 border border-gray-200 bg-white p-6"
              onSubmit={handleSaveListing}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">
                  {editingProductId ? "Modify listing" : "New listing"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {editingProductId !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetNewListingForm();
                        setSubmitMessage(null);
                      }}
                      className="border border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white"
                    >
                      Discard
                    </button>
                  ) : null}
                </div>
              </div>
              {editingProductId !== null ? (
                <p className="text-sm text-black/60">
                  Changes apply to this product on save. Slug and SKU must stay
                  unique across the catalog.
                </p>
              ) : null}

              <div className="space-y-3 rounded border border-gray-200 bg-[#fafafa] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-black/60">
                      Product photos
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-black/55">
                      Order defines the PDP gallery — the first image is storefront
                      thumbnail and checkout image ({MAX_PRODUCT_GALLERY_IMAGES} max).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={galleryRows.length >= MAX_PRODUCT_GALLERY_IMAGES}
                    className="border border-gray-400 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
                    aria-label={`Add blank image URL row (${galleryRows.length} of ${MAX_PRODUCT_GALLERY_IMAGES})`}
                    onClick={() => {
                      if (galleryRows.length >= MAX_PRODUCT_GALLERY_IMAGES) return;
                      setGalleryRows((prev) => [
                        ...prev,
                        { rowKey: newVariationRowKey(), url: "" },
                      ]);
                    }}
                  >
                    Add URL row
                  </button>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload product photo file and append to gallery"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleUpload(file).catch(() =>
                        setSubmitMessage("Upload failed."),
                      );
                    }
                  }}
                  className="text-sm text-black"
                />
                <p className="text-xs text-black/55">
                  PNG, JPEG, WebP uploads append to the list — or paste URLs in rows below.
                </p>

                {galleryRows.length === 0 ? (
                  <p className="text-[11px] text-black/45" role="status">
                    No photos yet — upload, add a URL row, or pick from uploads below.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {galleryRows.map((row, idx) => {
                      const trimmed = row.url.trim();
                      const canPreview =
                        trimmed.startsWith("/") || trimmed.startsWith("http");

                      return (
                        <li
                          key={row.rowKey}
                          className="rounded border border-gray-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-start gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <label
                                className="text-[10px] uppercase tracking-[0.15em] text-black/55"
                                htmlFor={`gallery-url-${row.rowKey}`}
                              >
                                Image URL {idx === 0 ? "(primary thumbnail)" : ""}
                              </label>
                              <input
                                id={`gallery-url-${row.rowKey}`}
                                value={row.url}
                                spellCheck={false}
                                aria-label={`Product image URL ${idx + 1}`}
                                onChange={(e) =>
                                  setGalleryRows((prev) =>
                                    prev.map((r) =>
                                      r.rowKey === row.rowKey
                                        ? { ...r, url: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                                autoComplete="off"
                                placeholder="https://… or /uploads/..."
                                className="w-full border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-black"
                              />
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 border border-gray-200 bg-[#fafafa]">
                                {canPreview ? (
                                  <Image
                                    src={trimmed}
                                    alt=""
                                    fill
                                    sizes="68px"
                                    className="object-contain p-1"
                                    unoptimized={
                                      trimmed.startsWith("/uploads") ||
                                      trimmed.startsWith("/")
                                    }
                                  />
                                ) : (
                                  <span className="flex h-full items-center justify-center px-1 text-center text-[9px] text-black/40">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  aria-label={`Move image ${idx + 1} up`}
                                  disabled={idx === 0}
                                  className="border border-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase disabled:opacity-35"
                                  onClick={() =>
                                    setGalleryRows((prev) => {
                                      const j = idx - 1;
                                      if (j < 0) return prev;
                                      const next = [...prev];
                                      [next[idx], next[j]] = [
                                        next[j]!,
                                        next[idx]!,
                                      ];
                                      return next;
                                    })
                                  }
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move image ${idx + 1} down`}
                                  disabled={idx >= galleryRows.length - 1}
                                  className="border border-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase disabled:opacity-35"
                                  onClick={() =>
                                    setGalleryRows((prev) => {
                                      const j = idx + 1;
                                      if (j >= prev.length) return prev;
                                      const next = [...prev];
                                      [next[idx], next[j]] = [
                                        next[j]!,
                                        next[idx]!,
                                      ];
                                      return next;
                                    })
                                  }
                                >
                                  ↓
                                </button>
                              </div>
                              <button
                                type="button"
                                className="border border-red-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-red-900 hover:bg-red-50"
                                aria-label={`Remove gallery image row ${idx + 1}`}
                                onClick={() =>
                                  setGalleryRows((prev) =>
                                    prev.filter((r) => r.rowKey !== row.rowKey),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <details
                  className="border border-gray-200 bg-white"
                  onToggle={(event) => {
                    const el = event.currentTarget;
                    if (el.open) {
                      void loadUploads().catch(() => {});
                    }
                  }}
                >
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/75 outline-none marker:text-black/40 focus-visible:ring-2 focus-visible:ring-black">
                    Add from uploaded library
                  </summary>
                  <div className="border-t border-gray-200 px-4 pb-4 pt-4">
                    {uploadsLoading ? (
                      <p className="text-xs text-black/55" role="status">
                        Loading uploads…
                      </p>
                    ) : uploadsError ? (
                      <p className="text-xs text-red-800/90">{uploadsError}</p>
                    ) : uploadFiles.length === 0 ? (
                      <p className="text-xs text-black/55">
                        No files in the library yet. Upload via the field above or the
                        Media tab.
                      </p>
                    ) : (
                      <ul className="grid max-h-[min(360px,50vh)] list-none grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3 overflow-auto pr-1 pl-0">
                        {uploadFiles.map((file) => {
                          const inThisGallery = galleryRows.some(
                            (r) => r.url.trim() === file.publicUrl,
                          );
                          return (
                            <li key={file.publicUrl}>
                              <button
                                type="button"
                                onClick={() => {
                                  const u = file.publicUrl;
                                  if (
                                    galleryRows.length >= MAX_PRODUCT_GALLERY_IMAGES
                                  ) {
                                    setSubmitMessage(
                                      `Gallery is full (${MAX_PRODUCT_GALLERY_IMAGES}). Remove a row before adding.`,
                                    );
                                    return;
                                  }
                                  if (
                                    galleryRows.some((r) => r.url.trim() === u)
                                  ) {
                                    setSubmitMessage(
                                      "That file is already listed for this product.",
                                    );
                                    return;
                                  }
                                  setSubmitMessage(null);
                                  setGalleryRows((prev) => [
                                    ...prev,
                                    {
                                      rowKey: newVariationRowKey(),
                                      url: u,
                                    },
                                  ]);
                                }}
                                aria-label={`Append ${file.filename} to this listing gallery`}
                                aria-pressed={inThisGallery}
                                className={`flex w-full flex-col gap-1 border bg-white p-1.5 text-left transition hover:border-black ${
                                  inThisGallery
                                    ? "border-black ring-2 ring-black ring-offset-1"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="relative mx-auto aspect-square w-full max-w-[72px] border border-gray-100 bg-white">
                                  <Image
                                    src={file.publicUrl}
                                    alt=""
                                    fill
                                    sizes="72px"
                                    className="object-contain p-1"
                                    unoptimized={file.publicUrl.startsWith(
                                      "/uploads",
                                    )}
                                  />
                                </div>
                                <span className="line-clamp-2 break-all font-mono text-[9px] leading-tight text-black/55">
                                  {file.filename}
                                </span>
                                {file.inUse ? (
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-amber-800/90">
                                    In use
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <p className="mt-3 text-[11px] leading-relaxed text-black/45">
                      Each click adds another image slot. “In use” only means attached to
                      a listing elsewhere — duplicates are OK.
                    </p>
                  </div>
                </details>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="slug-field"
                      className="text-xs uppercase tracking-[0.2em] text-black/60"
                    >
                      Slug (kebab-case)
                    </label>
                    <button
                      type="button"
                      onClick={applyAutoSlugFromName}
                      className="border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black/75 hover:border-black"
                    >
                      Auto
                    </button>
                  </div>
                  <input
                    id="slug-field"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    required
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="sku-field"
                      className="text-xs uppercase tracking-[0.2em] text-black/60"
                    >
                      SKU
                    </label>
                    <button
                      type="button"
                      onClick={applyRandomSku}
                      className="border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black/75 hover:border-black"
                    >
                      Random
                    </button>
                  </div>
                  <input
                    id="sku-field"
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                    required
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="sm:col-span-2 rounded border border-dashed border-gray-300 bg-[#fafafa] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
                      Colour / variants (optional)
                    </p>
                    <button
                      type="button"
                      className="border border-gray-400 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:border-black"
                      onClick={() =>
                        setVariationRows((prev) => [
                          ...prev,
                          {
                            rowKey: newVariationRowKey(),
                            sku: "",
                            label: "",
                            sortOrder: String(prev.length),
                          },
                        ])
                      }
                    >
                      Add row
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-black/55">
                    Shopper-facing label (e.g. Black dial) and a unique SKU per
                    variant. Variant SKUs must differ from the main listing SKU above.
                  </p>
                  {variationRows.length === 0 ? (
                    <p className="mt-3 text-[11px] text-black/45">No extra options.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {variationRows.map((row, idx) => (
                        <li
                          key={row.rowKey}
                          className="grid gap-2 border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                        >
                          <div>
                            <label
                              className="text-[10px] uppercase tracking-[0.15em] text-black/55"
                              htmlFor={`variation-label-${row.rowKey}`}
                            >
                              Label (colour)
                            </label>
                            <input
                              id={`variation-label-${row.rowKey}`}
                              value={row.label}
                              onChange={(e) =>
                                setVariationRows((prev) =>
                                  prev.map((p) =>
                                    p.rowKey === row.rowKey
                                      ? { ...p, label: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                              placeholder='e.g. "Silver"'
                              autoComplete="off"
                            />
                          </div>
                          <div>
                            <label
                              className="text-[10px] uppercase tracking-[0.15em] text-black/55"
                              htmlFor={`variation-sku-${row.rowKey}`}
                            >
                              SKU
                            </label>
                            <input
                              id={`variation-sku-${row.rowKey}`}
                              value={row.sku}
                              onChange={(e) =>
                                setVariationRows((prev) =>
                                  prev.map((p) =>
                                    p.rowKey === row.rowKey
                                      ? { ...p, sku: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              className="mt-1 w-full border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-black"
                              placeholder="Unique variant SKU"
                              autoComplete="off"
                            />
                          </div>
                          <div className="sm:max-w-[5rem]">
                            <label
                              className="text-[10px] uppercase tracking-[0.15em] text-black/55"
                              htmlFor={`variation-sort-${row.rowKey}`}
                            >
                              Sort
                            </label>
                            <input
                              id={`variation-sort-${row.rowKey}`}
                              inputMode="numeric"
                              value={row.sortOrder}
                              onChange={(e) =>
                                setVariationRows((prev) =>
                                  prev.map((p) =>
                                    p.rowKey === row.rowKey
                                      ? { ...p, sortOrder: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                              autoComplete="off"
                            />
                          </div>
                          <div className="flex items-end pb-1 sm:justify-end">
                            <button
                              type="button"
                              className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-800 underline-offset-4 hover:underline"
                              aria-label={`Remove variation row ${idx + 1}`}
                              onClick={() =>
                                setVariationRows((prev) =>
                                  prev.filter((p) => p.rowKey !== row.rowKey),
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-black/60">
                    Store categories
                  </p>
                  <div className="mt-2 space-y-2 rounded border border-gray-300 bg-white px-4 py-3">
                    {listingCategories.length === 0 ? (
                      <p className="text-sm text-black/55">
                        No categories - add some first
                      </p>
                    ) : (
                      listingCategories.map((opt) => {
                        const checked = activeListingCategoryIds.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className="flex items-center gap-2 text-sm text-black"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setListingCategoryIds((previous) => {
                                  if (event.target.checked) {
                                    if (previous.includes(opt.id)) {
                                      return previous;
                                    }
                                    return [...previous, opt.id];
                                  }
                                  return previous.filter((id) => id !== opt.id);
                                })
                              }
                              className="h-4 w-4 accent-black"
                            />
                            <span>
                              {opt.label} (/{opt.slug}/)
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-2 text-xs text-black/50">
                    A listing can appear on multiple collection pages (URLs match
                    the Categories tab).
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="name-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Display name
                  </label>
                  <input
                    id="name-field"
                    value={name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setName(nextName);
                      if (editingProductId === null) {
                        setSlug((prev) =>
                          prev.trim() === "" ? slugifyListingName(nextName) : prev,
                        );
                      }
                    }}
                    required
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="brand-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Brand
                  </label>
                  <input
                    id="brand-field"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    required
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="badge-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Badge
                  </label>
                  <select
                    id="badge-field"
                    value={badge}
                    aria-label="Product badge"
                    onChange={(event) =>
                      setBadge(event.target.value as typeof badge)
                    }
                    className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="NONE">Standard</option>
                    <option value="SALE">Sale</option>
                    <option value="SOLD_OUT">Sold Out</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="price-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Price (BDT major units)
                  </label>
                  <input
                    id="price-field"
                    value={priceMajor}
                    onChange={(event) => setPriceMajor(event.target.value)}
                    inputMode="decimal"
                    required
                    placeholder="114000"
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="compare-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Compare-at price (optional)
                  </label>
                  <input
                    id="compare-field"
                    value={compareMajor}
                    onChange={(event) => setCompareMajor(event.target.value)}
                    inputMode="decimal"
                    placeholder="120000"
                    className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="description-field"
                    className="text-xs uppercase tracking-[0.2em] text-black/60"
                  >
                    Description
                  </label>
                  <textarea
                    id="description-field"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    rows={6}
                    className="mt-2 w-full resize-y border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black py-4 text-xs font-bold uppercase tracking-[0.26em] text-white"
              >
                {editingProductId ? "Save changes" : "Save listing"}
              </button>
              {submitMessage ? (
                <p className="text-sm text-black/65">{submitMessage}</p>
              ) : null}
            </form>
          </section>
        ) : null}
        </div>
      ) : null}
    </div>
  );
}
