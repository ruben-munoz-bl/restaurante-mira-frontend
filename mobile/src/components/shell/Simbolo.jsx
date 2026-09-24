/**
 * Ligaduras Material Symbols → icono nativo (@expo/vector-icons MaterialIcons).
 * El web usa <span class="material-symbols-outlined">search</span>; aquí
 * <Simbolo name="search" />. La mayoría de nombres coinciden; el MAPA cubre
 * las excepciones (o alias más legibles).
 */
import { MaterialIcons } from '@expo/vector-icons';

const MAPA = {
  calendar_today: 'calendar-today',
  location_on: 'location-on',
  add_business: 'add-business',
  workspace_premium: 'workspace-premium',
  cloud_upload: 'cloud-upload',
  cloud_download: 'cloud-download',
  account_balance_wallet: 'account-balance-wallet',
  receipt_long: 'receipt-long',
  point_of_sale: 'point-of-sale',
  event_available: 'event-available',
  picture_as_pdf: 'picture-as-pdf',
  upload_file: 'file-upload',
  folder_open: 'folder-open',
  expand_less: 'expand-less',
  unfold_more: 'unfold-more',
  dark_mode: 'dark-mode',
  light_mode: 'light-mode',
  file_present: 'file-present',
  person_off: 'person-off',
  table_chart: 'table-chart',
  chevron_left: 'chevron-left',
  chevron_right: 'chevron-right',
  verified: 'verified',
  storefront: 'storefront',
  schedule: 'schedule',
  download: 'file-download',
  warning: 'warning',
  loyalty: 'loyalty',
  devices: 'devices',
  notifications: 'notifications',
  lock: 'lock',
  info: 'info',
  star: 'star',
  euro: 'euro',
  menu: 'menu',
  search: 'search',
  close: 'close',
  check: 'check',
  mail: 'mail',
  edit: 'edit',
  delete: 'delete',
  groups: 'groups',
  receipt: 'receipt',
  today: 'today',
  expand_more: 'expand-more',
  arrow_back: 'arrow-back',
  arrow_forward: 'arrow-forward',
  add: 'add',
  remove: 'remove',
  logout: 'logout',
  person: 'person',
  home: 'home',
  map: 'map',
  favorite: 'favorite',
  favorite_border: 'favorite-border',
  star_border: 'star-border',
  emoji_events: 'emoji-events',
  workspace_premium_filled: 'workspace-premium',
  check_circle: 'check-circle',
  cancel: 'cancel',
  refresh: 'refresh',
  filter_list: 'filter-list',
  sort: 'sort',
  visibility: 'visibility',
  visibility_off: 'visibility-off',
  key: 'key',
  badge: 'badge',
  storefront_filled: 'storefront',
};

export function Simbolo({ name, size = 20, color, style }) {
  const glyph = MAPA[name] || name;
  return <MaterialIcons name={glyph} size={size} color={color} style={style} />;
}

export default Simbolo;
