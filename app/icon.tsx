import { renderAppIcon } from "@/lib/brand/app-icon";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(size.width);
}
