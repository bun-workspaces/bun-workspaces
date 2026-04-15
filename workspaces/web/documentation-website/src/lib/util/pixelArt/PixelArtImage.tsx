export interface PixelArtImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  small?: boolean;
}

export const PixelArtImage = ({
  path,
  small,
  ...props
}: PixelArtImageProps) => {
  return (
    <img
      src={path}
      {...props}
      className={`pixel-art-image ${small ? "small" : ""} ${props.className}`}
    />
  );
};
