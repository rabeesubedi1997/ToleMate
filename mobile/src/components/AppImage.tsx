import React, { useState } from 'react';
import { Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { assetUrl } from '../config';

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=70';

interface Props {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const AppImage: React.FC<Props> = ({ uri, style, resizeMode = 'cover' }) => {
  const [failed, setFailed] = useState(false);
  const source = { uri: failed || !uri ? FALLBACK_IMAGE : assetUrl(uri) };

  return (
    <Image
      source={source}
      style={style ?? styles.default}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  default: {
    width: '100%',
    height: 160,
  },
});

export default AppImage;
