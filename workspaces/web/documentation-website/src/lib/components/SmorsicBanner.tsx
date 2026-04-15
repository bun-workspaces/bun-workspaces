import SmorsicBannerLogo from "../../pages/public/images/svg/smorsic-logo-title_outline_variable.svg?react";

export const SmorsicBanner = ({
  width,
}: {
  width?: React.CSSProperties["width"];
}) => {
  return (
    <a
      className="smorsic-banner"
      href="https://smorsic.io"
      target="_blank"
      rel="noopener noreferrer"
      style={{ width }}
    >
      <SmorsicBannerLogo className="smorsic-banner-logo" width="100%" />
    </a>
  );
};
