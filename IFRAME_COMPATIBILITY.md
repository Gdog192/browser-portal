# IFrame Compatibility Guide

## The "Refused to Connect" Error

When using Browser Portal in **direct iframe mode** (no proxy), you may encounter "refused to connect" errors for certain websites. This is **normal and expected behavior** due to browser security policies.

### Why This Happens

Most major websites block iframe embedding using HTTP security headers:

- **X-Frame-Options**: Set to `DENY` or `SAMEORIGIN` to prevent clickjacking attacks
- **Content-Security-Policy**: Uses `frame-ancestors` directive to control where sites can be embedded

These are legitimate security measures implemented by website owners to protect their users.

### Example of Blocked Sites

**Sites that BLOCK iframe embedding:**
- ❌ Google.com
- ❌ YouTube.com  
- ❌ Facebook.com
- ❌ Twitter/X.com
- ❌ Instagram.com
- ❌ Reddit.com
- ❌ Amazon.com
- ❌ Netflix.com
- ❌ Bank websites
- ❌ Most major social media platforms

**Sites that ALLOW iframe embedding:**
- ✅ Wikipedia.org
- ✅ Many smaller blogs and documentation sites
- ✅ Sites specifically designed for embedding
- ✅ Some educational resources
- ✅ Many GitHub Pages sites

### How to Check if a Site Will Work

There's no way to know for certain without testing, but generally:

1. **Larger, security-conscious sites** → Likely BLOCKED
2. **Smaller, open-content sites** → Might WORK
3. **Sites with login/sensitive data** → Definitely BLOCKED

### Solutions

#### Option 1: Test and Use Compatible Sites
Only add sites to your config.json that actually work with iframe embedding.

#### Option 2: Accept the Limitation
Use Browser Portal for sites that allow embedding, and open blocked sites in regular browser tabs.

#### Option 3: Implement a Proxy (Advanced)
If you need to embed restricted sites, you'll need to set up a proxy server that removes the X-Frame-Options headers. However:
- This is technically complex
- May violate sites' Terms of Service  
- Can trigger anti-bot protection
- Requires significant server resources

### Current Setup

Browser Portal is configured for **direct iframe mode**:
- ✅ Simple, fast, no server-side proxying
- ✅ Works with iframe-friendly sites
- ❌ Cannot bypass X-Frame-Options restrictions
- ❌ Major sites will show "refused to connect"

### Testing Sites

To test if a site works, simply enter its URL in the search bar:
1. If it loads → Site allows iframe embedding
2. If you see "refused to connect" → Site blocks iframe embedding
3. Add working sites to your config.json for quick access

---

**Note**: This is not a bug in Browser Portal - it's how web security works. No client-side solution can bypass these restrictions without server-side proxy intervention.
