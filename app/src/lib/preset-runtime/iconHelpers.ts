/**
 * iconHelpers — curated lucide-react icon registry exposed to generated presets.
 *
 * Problem this solves: without a registry, the AI hallucinates SVG path data for
 * icons (draws a "house" as a random blob) OR tries to import packages it can't.
 *
 * With iconHelpers, the AI calls `iconHelpers.getIcon("home")` and receives a real
 * lucide React component it can render directly:
 *
 *   const HomeIcon = iconHelpers.getIcon("home");
 *   <HomeIcon size={48} color={accentColor} strokeWidth={1.5} />
 *
 * The registry is intentionally small (~120 icons) to keep the injected scope tidy,
 * and lookup is alias-tolerant ("check", "checkmark", "tick" all resolve).
 */

import {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  Award, BarChart, Battery, Bell, BellOff, Bookmark, Briefcase, Calendar, Camera,
  Car, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Circle, Clock, Cloud, Code, Coffee, Copy, CreditCard, Database, DollarSign,
  Download, Edit, Eye, EyeOff, Facebook, File, FileText, Film, Filter, Flag, Folder,
  Gift, Github, Globe, Grid, Hash, Headphones, Heart, HelpCircle, Home, Image, Inbox,
  Info, Instagram, Key, Layers, Layout, Leaf, Library, LifeBuoy, Link, Linkedin, List,
  Lock, LogIn, LogOut, Mail, Map, MapPin, Maximize, Menu, MessageCircle, MessageSquare,
  Mic, Minimize, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, Music,
  Navigation, Package, Paperclip, Pause, PenTool, Phone, PieChart, Play, Plus,
  Power, Printer, Rocket, Rss, Save, Search, Send, Server, Settings, Share, Share2,
  Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Smile, Speaker, Square, Star,
  Sun, Sunrise, Sunset, Tag, Target, Terminal, ThumbsDown, ThumbsUp, Trash, Trash2,
  TrendingDown, TrendingUp, Truck, Twitter, Type, Umbrella, Upload, User, Users, Video,
  Volume, Volume2, VolumeX, Wallet, Watch, Wifi, Wind, X, XCircle, Youtube, Zap, ZoomIn, ZoomOut,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical icon names mapped to their lucide components.
 * Keys are lowercase kebab; aliases resolve via normalization.
 */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  activity: Activity, "alert-circle": AlertCircle, "alert-triangle": AlertTriangle,
  "arrow-down": ArrowDown, "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "arrow-up": ArrowUp,
  award: Award, "bar-chart": BarChart, battery: Battery, bell: Bell, "bell-off": BellOff,
  bookmark: Bookmark, briefcase: Briefcase, calendar: Calendar, camera: Camera, car: Car,
  check: Check, "check-circle": CheckCircle,
  "chevron-down": ChevronDown, "chevron-left": ChevronLeft, "chevron-right": ChevronRight, "chevron-up": ChevronUp,
  circle: Circle, clock: Clock, cloud: Cloud, code: Code, coffee: Coffee, copy: Copy,
  "credit-card": CreditCard, database: Database, "dollar-sign": DollarSign,
  download: Download, edit: Edit, eye: Eye, "eye-off": EyeOff, facebook: Facebook,
  file: File, "file-text": FileText, film: Film, filter: Filter, flag: Flag, folder: Folder,
  gift: Gift, github: Github, globe: Globe, grid: Grid, hash: Hash, headphones: Headphones,
  heart: Heart, "help-circle": HelpCircle, home: Home, image: Image, inbox: Inbox, info: Info,
  instagram: Instagram, key: Key, layers: Layers, layout: Layout, leaf: Leaf, library: Library,
  "life-buoy": LifeBuoy, link: Link, linkedin: Linkedin, list: List, lock: Lock,
  "log-in": LogIn, "log-out": LogOut, mail: Mail, map: Map, "map-pin": MapPin,
  maximize: Maximize, menu: Menu, "message-circle": MessageCircle, "message-square": MessageSquare,
  mic: Mic, minimize: Minimize, minus: Minus, monitor: Monitor, moon: Moon,
  "more-horizontal": MoreHorizontal, "more-vertical": MoreVertical, music: Music,
  navigation: Navigation, package: Package, paperclip: Paperclip, pause: Pause,
  "pen-tool": PenTool, phone: Phone, "pie-chart": PieChart, play: Play, plus: Plus,
  power: Power, printer: Printer, rocket: Rocket, rss: Rss, save: Save, search: Search,
  send: Send, server: Server, settings: Settings, share: Share, "share-2": Share2,
  shield: Shield, "shopping-bag": ShoppingBag, "shopping-cart": ShoppingCart,
  shuffle: Shuffle, smartphone: Smartphone, smile: Smile, speaker: Speaker,
  square: Square, star: Star, sun: Sun, sunrise: Sunrise, sunset: Sunset, tag: Tag,
  target: Target, terminal: Terminal, "thumbs-down": ThumbsDown, "thumbs-up": ThumbsUp,
  trash: Trash, "trash-2": Trash2, "trending-down": TrendingDown, "trending-up": TrendingUp,
  truck: Truck, twitter: Twitter, type: Type, umbrella: Umbrella, upload: Upload,
  user: User, users: Users, video: Video, volume: Volume, "volume-2": Volume2, "volume-x": VolumeX,
  wallet: Wallet, watch: Watch, wifi: Wifi, wind: Wind, x: X, "x-circle": XCircle,
  youtube: Youtube, zap: Zap, "zoom-in": ZoomIn, "zoom-out": ZoomOut,
};

/**
 * Aliases: common synonyms → canonical key.
 * Lets the AI call `getIcon("tick")` or `getIcon("cart")` and get the right thing.
 */
const ICON_ALIASES: Record<string, string> = {
  tick: "check", checkmark: "check", ok: "check",
  close: "x", cancel: "x", remove: "x",
  cart: "shopping-cart", bag: "shopping-bag",
  warning: "alert-triangle", error: "alert-circle", danger: "alert-circle",
  success: "check-circle", done: "check-circle",
  pin: "map-pin", location: "map-pin", marker: "map-pin",
  profile: "user", account: "user", person: "user",
  team: "users", group: "users",
  chat: "message-circle", message: "message-square",
  delete: "trash-2", bin: "trash-2",
  email: "mail", envelope: "mail",
  gear: "settings", cog: "settings",
  magnifier: "search", "search-icon": "search",
  arrow: "arrow-right", next: "arrow-right", back: "arrow-left",
  play_button: "play", "play-button": "play",
  like: "thumbs-up", dislike: "thumbs-down",
  favorite: "heart", love: "heart",
  fav: "star", starred: "star",
  graph: "bar-chart", analytics: "bar-chart", chart: "bar-chart",
  trending: "trending-up", growth: "trending-up",
  world: "globe", earth: "globe", international: "globe",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-icon$/, "");
}

/**
 * Resolve an icon name (with alias fallback) to a lucide React component.
 * Returns null if nothing matches — the AI should fall back to a basic shape.
 *
 * @example
 *   const Cart = iconHelpers.getIcon("cart");  // → ShoppingCart
 *   <Cart size={48} color="#fff" strokeWidth={2} />
 */
export function getIcon(name: string): LucideIcon | null {
  const key = normalize(name);
  if (ICON_REGISTRY[key]) return ICON_REGISTRY[key];
  const aliasTarget = ICON_ALIASES[key];
  if (aliasTarget && ICON_REGISTRY[aliasTarget]) return ICON_REGISTRY[aliasTarget];
  return null;
}

/**
 * List every available canonical icon name. Useful for the AI to pick
 * the best match from the actual registry rather than guessing.
 */
export function listIcons(): string[] {
  return Object.keys(ICON_REGISTRY).sort();
}

export const iconHelpers = {
  getIcon,
  listIcons,
};

export type IconHelpers = typeof iconHelpers;
