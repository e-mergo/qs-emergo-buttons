/**
 * Imported Qlik utility library
 *
 * @since  QS February 2024 Patch 3
 * @source 1368.1a9a8be2cc130e589e9b.js/9616
 */
define([
	"jquery",
	"general.utils/string-normalization"
], function( $, StringNormalization ) {
	"use strict";

    const a = {
        getChar(t) {
            let e = t
              , n = -1;
            return e > 9 ? (n = 65 + e - 10,
            n > 90 && (n += 6)) : e = `${e}`.charCodeAt(0),
            [48, 111, 79, 105, 73, 108].indexOf(n) > -1 ? this.getChar(e + 1) : String.fromCharCode(n)
        },
        base62(t) {
            const e = this.getChar(t % 62)
              , n = Math.floor(t / 62);
            return n > 0 ? this.base62(n) + e : e
        },
        id() {
            return this.base62(Math.round(99e11 * Math.random() + 1e11)).replace(/\W/g, "")
        }
    };

    function l(t) {
        const e = (+t).toString(16);
        return 1 === e.length ? `0${e}` : e
    }

    function c(t, e, n) {
        const i = e.split(".");
        let o = t;
        if (void 0 === o)
            return n;
        for (let t = 0; t < i.length; ++t) {
            if (null == o[i[t]])
                return n;
            o = o[i[t]]
        }
        return o
    }

    function u(t, e, n) {
        if (!e)
            return;
        const i = e.split(".");
        let o = t;
        const r = i[i.length - 1];
        for (let t = 0; t < i.length - 1; ++t)
            null == o[i[t]] && (o[i[t]] = Number.isNaN(+i[t + 1]) ? {} : []),
            o = o[i[t]];
        void 0 !== n ? o[r] = n : delete o[r]
    }

    const d = {
        findValuesOfQProperty(t, e) {
            const n = [];
            return function t(i, o) {
                i && "object" == typeof i && (Array.isArray(i) ? i.forEach(((e,n)=>{
                    t(e, `${o}/${n}`)
                }
                )) : Object.keys(i).forEach((r=>{
                    const s = typeof i[r];
                    r === e ? n.push(i[r]) : "object" === s && /^[^q]/.test(r) && t(i[r], `${o}/${r}`)
                }
                )))
            }(t, ""),
            n
        },
        isEqual: (t,e)=>r.default.isEqual(t, e),
        // unique: r.default.unique,
        normalizeToHex(t) {
            if ("string" == typeof t && "#" === t[0])
                return t;
            if (0 === t)
                return "#000000";
            let e;
            const n = /rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})/i.exec(String(t));
            if (n)
                e = `#${l(n[1])}${l(n[2])}${l(n[3])}`;
            else if ("string" == typeof t && 0 !== t.indexOf("#") && /^[a-f0-9]{3,6}$/i.test(t))
                e = `#${t}`;
            else if (/^[0-9]+$/.test(String(t))) {
                const n = Number(t);
                e = `#${((255 & n) << 16 | 65280 & n | (16711680 & n) >>> 16).toString(16)}`
            } else
                e = null;
            return e
        },
        numberFormat(t, e, n) {
            const i = {
                3: "k",
                6: "M",
                9: "G",
                12: "T",
                15: "P",
                18: "E",
                21: "Z",
                24: "Y",
                "-3": "m",
                "-6": "μ",
                "-9": "n",
                "-12": "p",
                "-15": "f",
                "-18": "a",
                "-21": "z",
                "-24": "y"
            };
            let o, r = "";
            if (Number.isNaN(+t) || Number.isNaN(+e) || Number.isNaN(+n))
                return String(t);
            let s = Number(Number(t).toPrecision(e));
            const a = n - n % 3;
            return a in i ? (r = i[a],
            s /= 10 ** a,
            s = Number(s.toPrecision(e))) : 0 === a && (o = 10 ** e,
            s = Math.round(s * o) / o),
            s + r
        },
        setDefaultValue: function(t, e, n) {
            void 0 === c(t, e) && u(t, e, n)
        },
        setValue: u,
        getValue: c,
        generateId: ()=>a.id(),
        escapeRegExp: t=>t.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&"),
        match: function t(e, n) {
            return "string" == typeof e ? -1 !== StringNormalization.string(e.toLowerCase()).indexOf(StringNormalization.string(n)) : e instanceof Array && e.some((e=>t(e, n)))
        },
        crop: (t,e)=>t.length > e ? t.substring(0, e) : t,
        isEdge() {
            const t = navigator.userAgent;
            return /Edge\/\d+/.test(t)
        },
        isMSIE() {
            const t = navigator.userAgent;
            return t.indexOf(" MSIE ") > -1 || t.indexOf(" Trident/") > -1
        },
        isIos: ()=>/iPad|iPhone|iPod/.test(navigator.userAgent) || "MacIntel" === navigator.platform && navigator.maxTouchPoints > 1,
        isAndroid: ()=>/Android/.test(navigator.userAgent),
        isSafari() {
            const t = navigator.userAgent;
            return t.indexOf("Chrome") < 0 && /Safari\/\d+/.test(t)
        },
        isFirefox() {
            const t = navigator.userAgent;
            return /Firefox\/\d+/.test(t)
        },
        extend: $.extend,
        isNumeric(t) {
            const e = t;
            return !Number.isNaN(parseFloat(e)) && Number.isFinite(+e)
        },
        isInteger(t) {
            const e = t;
            return !Number.isNaN(parseInt(e, 10)) && parseFloat(e) === parseInt(e, 10)
        },
        escapeField: t=>t && "]" !== t ? /^[A-Za-z][A-Za-z0-9_]*$/.test(t) ? t : `[${t.replace(/\]/g, "]]")}]` : t,
        isEmpty: t=>$.isEmptyObject(t),
        hasFileExtension(t, e) {
            if (e) {
                const n = "." === e.substring(0, 1) ? e : `.${e}`;
                return t.substring(t.length - n.length).toUpperCase() === n.toUpperCase()
            }
            return !1
        },
        hasAnyFileExtension: (t,e)=>(e || []).some((e=>d.hasFileExtension(t, e))),
        ellipseText(t, e) {
            let n = t;
            return n.length > e && (n = `${n.substring(0, e - 3)}...`),
            n
        },
        hashFromString(t) {
            let e = 0;
            if (!t || !t.length)
                return e;
            for (let n = 0; n < t.length; n++) {
                e = (e << 5) - e + t.charCodeAt(n),
                e &= e
            }
            return e
        },
        evaluateCondition(t) {
            if (t && t.length >= 2 && "/" === t[0] && "/" === t[1])
                return !0;
            const e = t ? +t : -1;
            return Number.isNaN(+e) ? "true" === t.toLowerCase() : 0 !== e
        },
        isArrowFn: t=>"function" == typeof t && /^[^{]+?=>/.test(t.toString()),
        resetBrowserZoom() {
            const t = document.querySelector('meta[name="viewport"]');
            t instanceof HTMLMetaElement && (t.content = "width=device-width, minimum-scale=1.0, maximum-scale=1.0, initial-scale=1.0")
        }
    }
    
    return d;
});
