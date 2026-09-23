import type { PublicImage } from '@forestwatch/types';
import { Image, StyleSheet } from 'react-native';

export function StoredPhoto({ image, alt }: { image: PublicImage; alt: string }) {
  return <Image accessibilityLabel={alt} source={{ uri: image.thumbnailUrl }} style={styles.image} />;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 77, 58, 0.08)',
  },
});
