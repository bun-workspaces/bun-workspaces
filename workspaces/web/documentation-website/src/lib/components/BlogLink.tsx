import { BW_BLOG_URL } from "../util/env";

export const BlogLink = ({
  path,
  ...props
}: React.ComponentProps<"a"> & { path?: string }) => (
  <a
    href={path ? `${BW_BLOG_URL}/${path}` : BW_BLOG_URL}
    className="inline-link"
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  />
);
