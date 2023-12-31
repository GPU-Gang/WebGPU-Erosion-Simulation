import { Html, Head, Main, NextScript } from 'next/document';

const Document: React.FunctionComponent = () => {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css?family=Inconsolata&display=swap"
          rel="stylesheet"
        />
        <meta
          httpEquiv="origin-trial"
          content="Ajk6hJ+H2On45QTvVPJLRgjt+S01bdGuXXSu9Oci5oOcypHiuDPM6hW5Wp1GRegFTOU77li5tYRZrhp+RN2ZYgAAAABQeyJvcmlnaW4iOiJodHRwczovL3dlYmdwdS5naXRodWIuaW86NDQzIiwiZmVhdHVyZSI6IldlYkdQVSIsImV4cGlyeSI6MTY5MTcxMTk5OX0="
        />
        <link
          rel="icon"
          type="image/x-icon"
          href={`${process.env.BASE_PATH || ''}/terrainXLogo.ico`}
          // NOTE: The "XXX.ico" above can be used to update the icon on the tab!
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;
