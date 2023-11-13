import Head from 'next/head';
import { AppProps } from 'next/app';

import './styles.css';
import styles from './MainLayout.module.css';

const title = 'Terrain X';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="Interactive terrain authoring and erosion simulation on WebGPU"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Head>
      <div className={styles.wrapper}>
        <Component {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
