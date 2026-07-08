import type { ImgHTMLAttributes } from 'react';

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

export default function Image({ alt, src, ...props }: ImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} src={typeof src === 'string' ? src : undefined} {...props} />;
}
