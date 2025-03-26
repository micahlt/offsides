import React from 'react';

if (process.env.NODE_ENV === 'development') {
    console.log("Loading Why Did You Render")
    const whyDidYouRender = require('@welldone-software/why-did-you-render');
    whyDidYouRender(React, {});
}