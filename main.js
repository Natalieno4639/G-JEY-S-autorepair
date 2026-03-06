// main.js — site behaviors: nav, smooth scroll, counters, logo animation (robust)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');

    if (navToggle && mainNav) {
      navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
    }

    // Unified anchor handler (handles click & touchend). Prevent double-handling on touch devices.
    let lastHandledAt = 0;
    function handleAnchorTap(e) {
      const now = Date.now();
      if (now - lastHandledAt < 600) return; // debounce double events

      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        lastHandledAt = now;

        // brief visual feedback for taps
        document.body.classList.add('is-scrolling');
        setTimeout(() => document.body.classList.remove('is-scrolling'), 900);

        const header = document.querySelector('.site-header');
        const headerOffset = header ? header.offsetHeight + 8 : 96;
        const targetRect = target.getBoundingClientRect();
        let scrollTop = Math.round(window.scrollY + targetRect.top - headerOffset);

        if (href === '#contact') {
          const centerOffset = Math.round((window.innerHeight - targetRect.height) / 2);
          scrollTop = Math.round(window.scrollY + targetRect.top - centerOffset);
        }

        try {
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
        } catch (err) {
          try { target.scrollIntoView(true); } catch (err2) { /* ignore */ }
        }

        // close mobile menu if open
        try { if (mainNav && mainNav.classList.contains('open')) mainNav.classList.remove('open'); } catch (err) {}
      }
    }

    // Use pointerup for reliable single-tap handling across devices, click as a fallback
    document.addEventListener('pointerup', (e) => handleAnchorTap(e), {passive:false});
    document.addEventListener('click', (e) => handleAnchorTap(e), {passive:false});

    // Active nav highlighting based on scroll
    const sections = document.querySelectorAll('main section[id], footer [id]');
    const navLinks = document.querySelectorAll('.main-nav a');
    if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const id = entry.target.id;
          const link = document.querySelector('.main-nav a[href="#' + id + '"]');
          if (entry.isIntersecting) {
            navLinks.forEach(l => l.classList.remove('active'));
            if (link) link.classList.add('active');
          }
        });
      }, { threshold: 0.45 });
      sections.forEach(s => sectionObserver.observe(s));
    }

    // Animated counters (runs once when visible)
    const counters = document.querySelectorAll('[data-target]');
    if (counters.length && 'IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.9 });

      counters.forEach(c => counterObserver.observe(c));
    }

    function formatNumber(n) {
      if (n >= 1000) return Math.round(n / 100) / 10 + 'K+';
      return String(n);
    }

    function runCounter(el) {
      const target = +el.dataset.target;
      const duration = 1500;
      let start = null;
      function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const value = Math.floor(progress * target);
        el.textContent = formatNumber(value);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = formatNumber(target);
      }
      requestAnimationFrame(step);
    }

    // Year in footer
    try { const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear(); } catch (err) {}

    // Logo animation & selector (play on load, replay on click, cycle + download)
    try {
      const logoLink = document.querySelector('.logo');
      const variants = Array.from(document.querySelectorAll('.logo-variant'));
      const prevBtn = document.getElementById('logoPrev');
      const nextBtn = document.getElementById('logoNext');
      const dlBtn = document.getElementById('logoDownload');
      // If there's only one variant, remove prev/next buttons to simplify the UI
      if (variants.length <= 1) {
        if (prevBtn) prevBtn.remove();
        if (nextBtn) nextBtn.remove();
      }
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let idx = variants.findIndex(v => v.classList.contains('active'));
      if (idx < 0) idx = 0;

      function setActive(i, { animate = true } = {}) {
        variants.forEach((v, j) => v.classList.toggle('active', j === i));
        if (!prefersReduced && animate) {
          const svg = variants[i];
          if (!svg) return;
          svg.classList.remove('logo-animate');
          void svg.offsetWidth;
          svg.classList.add('logo-animate');
        }
      }

      if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); idx = (idx - 1 + variants.length) % variants.length; setActive(idx); });
      if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); idx = (idx + 1) % variants.length; setActive(idx); });

      function downloadSVG(svgEl) {
        if (!svgEl) return;
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auto-repair-logo.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      if (dlBtn) dlBtn.addEventListener('click', (e) => { e.preventDefault(); downloadSVG(variants[idx]); });

      // Asset pack export (SVG -> PNGs -> ICO -> ZIP)
      const packBtn = document.getElementById('downloadPack');

      async function svgToPngBlob(svgEl, size){
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try{
              const canvas = document.createElement('canvas');
              canvas.width = size; canvas.height = size;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0,0,canvas.width,canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(b => resolve(b), 'image/png');
            }catch(err){ reject(err); }
          };
          img.onerror = reject;
          img.src = svg64;
        });
      }

      // CRC32 table for zip entries
      const CRC32_TABLE = (function(){
        const t = new Uint32Array(256);
        for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++){ c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1); } t[i]=c; }
        return t;
      })();
      function crc32(buf){
        let crc=0xFFFFFFFF;
        const arr=new Uint8Array(buf);
        for(let i=0;i<arr.length;i++){ crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ arr[i]) & 0xFF]; }
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      function uint32ToLE(n){ return [n & 0xFF, (n>>8)&0xFF, (n>>16)&0xFF, (n>>24)&0xFF]; }

      // Build a minimal uncompressed ZIP (no compression) from files [{name, data:Uint8Array}]
      function buildZip(files){
        const localFiles=[]; let offset=0;
        const encoder = new TextEncoder();
        // local file headers + file data
        for(const f of files){
          const nameBuf = encoder.encode(f.name);
          const crc = crc32(f.data);
          const compressedSize = f.data.length;
          const uncompressedSize = f.data.length;
          const localHeader = new Uint8Array(30 + nameBuf.length);
          const dv = new DataView(localHeader.buffer);
          // local file header signature
          localHeader.set([0x50,0x4B,0x03,0x04],0);
          // version needed, flags
          localHeader[4]=20; localHeader[5]=0; localHeader[6]=0; localHeader[7]=0;
          // compression method (0=store)
          localHeader[8]=0; localHeader[9]=0;
          // mod time/date (zero)
          localHeader.set([0,0,0,0],10);
          // CRC32
          localHeader.set(uint32ToLE(crc),14);
          // sizes
          localHeader.set(uint32ToLE(compressedSize),18);
          localHeader.set(uint32ToLE(uncompressedSize),22);
          // name length
          localHeader.set([nameBuf.length & 0xFF, (nameBuf.length>>8)&0xFF],26);
          // extra length 0
          localHeader.set([0,0],28);
          // insert name after header
          const headerAndName = new Uint8Array(localHeader.length + nameBuf.length);
          headerAndName.set(localHeader,0); headerAndName.set(nameBuf, localHeader.length);
          localFiles.push({header:headerAndName, data:f.data, crc, compressedSize, uncompressedSize, nameBuf, offset});
          offset += headerAndName.length + f.data.length;
        }

        // central directory
        let cdirSize = 0; const cdirParts=[]; for(const lf of localFiles){
          const cdir = new Uint8Array(46 + lf.nameBuf.length);
          // central file header signature
          cdir.set([0x50,0x4B,0x01,0x02],0);
          // version made (20 00)
          cdir[4]=20; cdir[5]=0;
          // version needed
          cdir[6]=20; cdir[7]=0;
          // flags
          cdir[8]=0; cdir[9]=0;
          // compression
          cdir[10]=0; cdir[11]=0;
          // mod time/date
          cdir.set([0,0,0,0],12);
          // CRC
          cdir.set(uint32ToLE(lf.crc),16);
          // sizes
          cdir.set(uint32ToLE(lf.compressedSize),20);
          cdir.set(uint32ToLE(lf.uncompressedSize),24);
          // name length
          cdir.set([lf.nameBuf.length & 0xFF, (lf.nameBuf.length>>8)&0xFF],28);
          // extra len, comment len
          cdir.set([0,0,0,0],30);
          // disk number start
          cdir.set([0,0],32);
          // internal/external attrs
          cdir.set([0,0,0,0],34);
          // relative offset (where local header begins)
          cdir.set(uint32ToLE(lf.offset),38);
          // name
          cdir.set(lf.nameBuf,46);
          cdirParts.push(cdir); cdirSize += cdir.length;
        }

        // end of central dir
        const eocd = new Uint8Array(22);
        eocd.set([0x50,0x4B,0x05,0x06],0);
        // number of this disk
        eocd.set([0,0],4);
        // number of the disk with the start of the central directory
        eocd.set([0,0],6);
        // total entries on this disk
        eocd.set([(localFiles.length & 0xFF), ((localFiles.length>>8)&0xFF)],8);
        // total entries
        eocd.set([(localFiles.length & 0xFF), ((localFiles.length>>8)&0xFF)],10);
        // size of central dir
        eocd.set(uint32ToLE(cdirSize),12);
        // offset of start of central dir
        eocd.set(uint32ToLE(offset),16);
        // comment length 0 (two bytes already zeroed)

        // concatenate all parts
        const parts = [];
        for(const lf of localFiles){ parts.push(lf.header); parts.push(lf.data); }
        for(const c of cdirParts) parts.push(c);
        parts.push(eocd);

        // compute total length
        let total=0; for(const p of parts) total += p.length;
        const out = new Uint8Array(total);
        let pos=0; for(const p of parts){ out.set(p,pos); pos += p.length; }
        return new Blob([out], { type:'application/zip' });
      }

      async function makeICOFromPNGs(pngBuffers, sizes){
        // pngBuffers: array of Uint8Array (PNG file bytes). sizes must match each png's width.
        let count = pngBuffers.length;
        let header = new Uint8Array(6);
        header.set([0,0,1,0, count & 0xFF, (count>>8)&0xFF],0);
        const dirEntries = [];
        let offset = 6 + 16 * count; // header + dir entries
        for(let i=0;i<count;i++){
          const png = pngBuffers[i];
          const size = sizes[i];
          const entry = new Uint8Array(16);
          entry[0] = size >= 256 ? 0 : size; // width
          entry[1] = size >= 256 ? 0 : size; // height
          entry[2] = 0; // color palette
          entry[3] = 0; // reserved
          // color planes, bit count (for PNGs set to 0)
          entry[4]=0; entry[5]=0; entry[6]=0; entry[7]=0;
          // image size
          const sizeLE = uint32ToLE(png.length);
          entry.set(sizeLE,8);
          // offset
          entry.set(uint32ToLE(offset),12);
          dirEntries.push(entry);
          offset += png.length;
        }
        // concat header + dirs + pngs
        let total = header.length + dirEntries.reduce((s,d)=>s+d.length,0) + pngBuffers.reduce((s,p)=>s+p.length,0);
        const out = new Uint8Array(total);
        let pos = 0; out.set(header,pos); pos += header.length; for(const d of dirEntries){ out.set(d,pos); pos += d.length; }
        for(const p of pngBuffers){ out.set(p,pos); pos += p.length; }
        return new Blob([out], { type: 'image/vnd.microsoft.icon' });
      }

      if (packBtn) packBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try{
          packBtn.disabled = true; const original = packBtn.textContent; packBtn.textContent = 'Preparing…';
          const sizes = [512,256,128,64,48,32,16];
          const files = [];
          // SVG
          const svgText = new XMLSerializer().serializeToString(variants[idx]);
          files.push({ name: 'GAMA-logo.svg', data: new Uint8Array(new TextEncoder().encode(svgText)) });
          // PNGs
          const pngBuffers = {};
          for(const s of sizes){
            const blob = await svgToPngBlob(variants[idx], s);
            const arr = new Uint8Array(await blob.arrayBuffer());
            files.push({ name: `GAMA-logo-${s}x${s}.png`, data: arr });
            pngBuffers[s] = arr;
          }
          // apple touch icon (180)
          const appleBlob = await svgToPngBlob(variants[idx], 180);
          const appleArr = new Uint8Array(await appleBlob.arrayBuffer());
          files.push({ name: 'apple-touch-icon-180x180.png', data: appleArr });

          // create ICO from 16/32/48
          const icoBufs = [pngBuffers[16], pngBuffers[32], pngBuffers[48]];
          const icoBlob = await makeICOFromPNGs(icoBufs, [16,32,48]);
          files.push({ name: 'favicon.ico', data: new Uint8Array(await icoBlob.arrayBuffer()) });

          const zipBlob = buildZip(files);
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a'); a.href = url; a.download = 'GAMA-logo-pack.zip'; document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
          packBtn.textContent = 'Done ✓';
          setTimeout(()=>{ packBtn.textContent = original; packBtn.disabled = false; }, 1200);
        }catch(err){ console.error('Export failed:', err); packBtn.disabled = false; packBtn.textContent = 'Error'; setTimeout(()=>packBtn.textContent='Download pack',1200); }
      });

      // Play initial active animation
      if (!prefersReduced) setTimeout(() => setActive(idx, { animate: true }), 300);

      if (logoLink) {
        logoLink.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // allow modified clicks
          try { setActive(idx, { animate: true }); } catch (err) { /* ignore */ }
        });
      }
    } catch (err) { /* ignore */ }

  } catch (error) {
    // Ensure errors don't stop the rest of the page
    console.error('Site script error (non-fatal):', error);
  }
});
