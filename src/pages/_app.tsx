import Head from 'next/head';
import { AppProps } from 'next/app';
import { useState } from 'react';

import './styles.css';
import styles from './MainLayout.module.css';

import { pages } from './samples/[slug]';

const title = 'Terrain X';

type PageType = {
  [key: string]: React.ComponentType & { render: { preload: () => void } };
};

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
        {/* NOTE: This is for the nav-bar on the left in the WebGPU samples, if we want it back later.

        <nav
          className={`${styles.panel} ${styles.container}`}
          data-expanded={listExpanded}
        >
          <h1>
            <Link href="/">{title}</Link>
            <div
              className={styles.expand}
              onClick={() => {
                setListExpanded(!listExpanded);
              }}
            ></div>
          </h1>
          <div className={styles.panelContents}>
            <a href={`https://github.com/${process.env.REPOSITORY_NAME}`}>
              Github
            </a>
            <hr />
            <ul className={styles.exampleList}>
              {samplesNames.map((slug) => {
                const className =
                  router.pathname === `/samples/[slug]` &&
                  router.query['slug'] === slug
                    ? styles.selected
                    : undefined;
                return (
                  <li
                    key={slug}
                    className={className}
                    onMouseOver={() => {
                      (pages as PageType)[slug].render.preload();
                    }}
                  >
                    <Link
                      href={`/samples/${slug}`}
                      onClick={() => {
                        setListExpanded(false);
                      }}
                    >
                      {slug}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <hr />
          </div>
        </nav> */}
        <Component {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
