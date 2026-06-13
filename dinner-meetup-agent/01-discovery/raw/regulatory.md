# Regulatory Landscape: H5 Social Dining Coordination App in China

> Research date: 2026-06-13
> Product: "今天整点啥" (H5 web app, no user accounts in MVP)
> Target market: Shenzhen Nanshan district
> Sources: PIPL (Wikipedia), Stanford DigiChina translations, Algorithmic Recommendation Provisions

---

## 1. Current Regulations

### 1.1 Personal Information Protection Law (PIPL / 个人信息保护法)

| Attribute | Detail |
|---|---|
| **Effective** | November 1, 2021 |
| **Scope** | All organizations processing personal information within China; extraterritorial reach for entities providing services to individuals in China |
| **Core mechanism** | Consent-based (no "legitimate interests" basis like GDPR) |
| **Applies to us?** | YES -- at launch and at scale |

**Key requirements:**

| Requirement | Applies to MVP? | Detail |
|---|---|---|
| Inform and obtain consent before collection | YES | Even without accounts, collecting preferences = personal information |
| Separate consent for sensitive data | YES (optional) | Location is "sensitive personal information"; requires separate, specific consent |
| No bundled consent | YES | Cannot refuse service if user withholds non-essential consent |
| Data minimization | YES | Only collect what is needed for the stated purpose |
| Right to access, correct, delete, port data | YES (even without accounts) | Users must be able to request deletion |
| Opt-out of personalized recommendations | YES | Algorithmic restaurant recs must offer opt-out |
| Impact assessment | YES | Required when processing sensitive data or using automated decision-making |
| Breach notification | YES | Must notify individuals if harm may have occurred |
| Privacy policy publication | YES | Must disclose purposes, methods, categories of data collected |
| Data localization | Possibly at scale | Certain thresholds may require storing data on China servers |
| China-based representative | Only if foreign entity | Foreign operators need a dedicated entity or representative in China |
| Publish social responsibility reports | Only at scale | Only for "large-scale" handlers with complex business models |

**Penalties:**
- General violations: up to 1 million RMB fine
- Grave violations: up to 50 million RMB or 5% of annual revenue
- Individual fines for responsible persons: 100,000 to 1 million RMB + possible management ban
- Tort liability with presumed fault (handler must prove they are NOT at fault)
- Public interest litigation by prosecutors/consumer organizations
- Credit blacklisting for violations

### 1.2 Data Security Law (数据安全法 / DSL)

| Attribute | Detail |
|---|---|
| **Effective** | September 1, 2021 |
| **Applies to us?** | YES -- data classification obligations |

Requires data classification (general, important, core). For an H5 dining app with minimal collection, data would likely be classified as "general" at MVP stage. Stricter requirements would apply if the app scales and collects large volumes of behavioral or location data.

### 1.3 Cybersecurity Law (网络安全法 / CSL)

| Attribute | Detail |
|---|---|
| **Effective** | June 1, 2017 |
| **Applies to us?** | Light at MVP -- heavier at scale |

Key obligations: network security protection, data breach reporting (to authorities within stipulated timeframe), personal information protection provisions (now largely superseded by PIPL). For an H5 app at MVP stage, the main concern is having a privacy policy and basic security measures for data collection.

### 1.4 Algorithmic Recommendation Management Provisions (互联网信息服务算法推荐管理规定)

| Attribute | Detail |
|---|---|
| **Effective** | March 1, 2022 |
| **Applies to us?** | YES -- AI conversation + restaurant recommendations = algorithmic recommendation service |

**Key obligations:**

| Requirement | Detail |
|---|---|
| Transparency | Notify users about algorithmic recommendation services; publicize basic principles, purposes, and main operational mechanisms |
| Opt-out mechanism | Provide "convenient option to switch off algorithmic recommendation services" |
| Tag control | Let users choose or delete user tags used for targeting |
| No addiction | Cannot design algorithms that induce "addiction or excessive consumption" |
| No price discrimination | Cannot use consumer characteristics for unreasonable differential pricing |
| No improper competition | Cannot impose unreasonable restrictions on other service providers |
| Elderly protection | Smart services suited to elderly users |
| Filing | Providers with "public opinion properties or social mobilization capabilities" must file within 10 working days and display filing number |
| Penalties | 1,000 to 10,000 RMB fines; potential suspension; criminal liability where applicable |

**Critical note on filing:** A dining recommendation app is UNLIKELY to qualify as having "public opinion properties or social mobilization capabilities" -- this typically applies to social media, news, and content platforms. However, this should be confirmed with local legal counsel.

---

## 2. Data & Privacy

### 2.1 Applicable Frameworks (summary)

| Framework | Applies at MVP? | Applies at Scale? |
|---|---|---|
| PIPL (consent, data rights, sensitive data) | YES | YES |
| DSL (data classification) | Light | YES |
| CSL (network security) | Light | YES |
| Algorithmic Recommendation Provisions | YES | YES |
| App Privacy Policy Guidelines (MIIT/CAC) | YES | YES |
| E-commerce Law | No (no transactions) | Possibly if monetized |
| Food Safety Law | No (not selling food) | No |
| Surveying and Mapping Law | Indirectly (via map API) | Indirectly |

### 2.2 Personal Information Map for This Product

| Data Type | PIPL Classification | Collected in MVP? | Consent Needed |
|---|---|---|---|
| Taste preferences, dietary restrictions | Personal information | YES (core feature) | General consent |
| Budget range | Personal information | YES | General consent |
| Geographic location (precise) | **Sensitive** personal information | Optional (user can skip) | **Separate, specific consent** |
| Subway station (manual input) | Personal information | Optional alternative | General consent |
| Conversation history / chat | Personal information | YES | General consent |
| Device / browser fingerprint | Personal information (potentially) | Possibly (H5 context) | General consent (cookie-like notice) |
| IP address | Personal information | Likely (server logs) | General consent |

### 2.3 Location Data Handling Requirements

Location data is classified as **sensitive personal information** under PIPL Article 28. This means:

1. **Separate consent required** -- cannot be bundled with general consent. The user must be shown a specific, standalone consent screen for location access.
2. **Necessity demonstration** -- must explain WHY location is needed and that it is necessary for the specific service function.
3. **Purpose limitation** -- can only use location data for the stated purpose (restaurant recommendations).
4. **Opt-out must be honored** -- user can decline location and still use the app.
5. **Data minimization** -- if user inputs a subway station instead of GPS, you should NOT collect precise location.

**Mitigation for MVP:** Since location is optional and users can manually enter subway station names, the regulatory burden is significantly lighter. Simply:
- Ask if user wants to share location
- Provide the subway station alternative prominently
- If location declined, never request it again during that session
- Do not use IP geolocation approximation as a workaround without disclosure

### 2.4 Impact on Product Architecture (No Accounts)

The MVP has **NO user accounts**, which significantly reduces regulatory burden:

| Obligation | With Accounts | Without Accounts (MVP) |
|---|---|---|
| Data access/portability requests | Complex; need user authentication system | Simpler; data primarily in-memory or short-lived |
| Data deletion | Must be able to delete user's data on request | Data naturally ephemeral; clear on session end |
| Privacy policy | Full policy needed | Still needed but simpler scope |
| Consent management | Ongoing consent dashboard | One-time per-session consent |
| Data retention | Defined retention periods | Can design for zero persistence |
| Appointment of DPO | Likely needed at scale | Not needed for MVP |

**Recommendation:** Design the MVP with **zero server-side persistence** of personal information. Process preferences, location, and conversation purely in-memory or with short-lived session storage. If logging is needed for debugging, anonymize or hash identifiers. This approach dramatically reduces compliance surface area.

### 2.5 Privacy Policy Requirements (Even Without Accounts)

Even without user registration, the app needs a privacy policy covering:

1. **Identity of the data handler** (operator/company name, contact info)
2. **What data is collected** (preferences, optional location, chat, device info)
3. **Purpose and method of collection** (restaurant recommendations via AI conversation)
4. **How sensitive data is handled** (location -- separate consent)
5. **Data retention period** (session-only or defined timeframe)
6. **How to exercise data rights** (contact method for deletion requests)
7. **Third-party SDK disclosures** (Amap/Tencent Maps API, any analytics)
8. **Security measures** (encryption, access controls)
9. **How consent can be withdrawn**
10. **Company registration info** (for complaints)

The privacy policy must be **accessible from the app** before data collection begins and **easy to find** during use.

---

## 3. Map API Compliance (Amap / Tencent Maps)

### 3.1 Regulations Governing Map APIs

| Regulation | Relevance |
|---|---|
| **Surveying and Mapping Law (测绘法)** | All map data providers must be licensed by the state; foreign entities cannot independently collect/map geospatial data in China |
| **Map Management Regulations (地图管理条例)** | Maps published in China must use officially approved data; certain POIs (military, sensitive infrastructure) may be restricted |
| **Internet Map Service Standards** | Internet map services must have government-issued qualifications |

### 3.2 Compliance Strategy

Since this product uses **Amap (高德地图) or Tencent Maps (腾讯地图) APIs** rather than building its own map:

1. Both Amap and Tencent Maps are **government-licensed** domestic map providers -- using them is compliant by default.
2. The product does NOT collect, store, or display raw map tiles -- it only queries POI data via API.
3. The product does NOT need its own Surveying and Mapping qualification -- the API provider handles that.
4. Developer must **register with a real-name verified account** on the API platform (Amap requires 实名认证).
5. API Terms of Service must be reviewed -- Amap/Tencent typically require attribution and restrict certain use cases.
6. **Disclose map SDK usage** in the privacy policy (third-party data sharing).

### 3.3 Registration Requirements

| Platform | Real-Name Verification | Business License | Notes |
|---|---|---|---|
| Amap (高德地图) | YES (personal 实名) | Not required for individual developer | Enterprise account needs business license for higher quota |
| Tencent Maps (腾讯地图) | YES (personal 实名) | Not required for individual developer | Similar to Amap |

---

## 4. Food/Restaurant Specific Regulations

### 4.1 Overview

There are **NO specific regulations targeting food recommendation platforms** in China. The regulatory framework is general:

| Concern | Governing Framework | Details |
|---|---|---|
| Recommendation fairness | Algorithmic Recommendation Provisions | Must be transparent, not discriminatory |
| Content liability | Tort Law / Civil Code | If recommending unsafe restaurants, potential liability |
| Consumer protection | Consumer Protection Law | Accurate information, no deceptive practices |
| Food safety information | Food Safety Law | If knowingly recommending unlicensed food operators, potential liability |

### 4.2 Negative Review / Restaurant Reputation Risk

China has specific risks regarding business reputation:
- **Civil Code Article 1024**: Protects reputation rights of legal persons (businesses)
- Negative recommendations that could be seen as "defamatory" carry risk
- **Mitigation**: Frame service as "personalized matching" rather than "rating/reviewing" restaurants

### 4.3 Cross-border Data Considerations

If the app uses foreign-hosted AI APIs (e.g., OpenAI, Anthropic) for the conversation feature, this triggers **cross-border data transfer** provisions under PIPL:
- Separate consent needed
- May require security assessment or standard contract
- **Recommendation**: Use a China-hosted LLM (通义千问, 文心一言, DeepSeek) to avoid cross-border complexity entirely

---

## 5. Enforcement & Precedent

### 5.1 Known Enforcement Patterns (2021-2025)

While direct mini-program/H5 enforcement data is limited from available sources, the general pattern of Chinese regulatory enforcement includes:

| Enforcement Body | Focus Areas | Typical Actions |
|---|---|---|
| **CAC (网信办)** | Privacy violations, illegal data collection, algorithm non-compliance | App takedowns, fines, public naming |
| **MIIT (工信部)** | App permissions abuse, excessive data collection, SDK violations | Regular batches of app removals from app stores |
| **SAMR (市场监管总局)** | Consumer rights, unfair competition | Fines, business license revocation |
| **MPS (公安部)** | Data security incidents, criminal violations | Criminal prosecution |

### 5.2 Common Violation Types (from public MIIT announcements)

Known violation patterns for apps and mini-programs:
1. Collecting personal data before obtaining consent
2. Requesting permissions beyond functional necessity
3. Not providing privacy policy or providing incomplete policy
4. Sharing data with third-party SDKs without disclosure
5. Not providing data deletion mechanisms
6. Frequency and excessive permission requests

### 5.3 Precedents Relevant to This Product

| Risk Factor | Precedent | Relevance |
|---|---|---|
| Collecting location without separate consent | MIIT regularly fines apps for this | HIGH -- ensure separate location consent flow |
| No privacy policy published | Multiple mini-programs removed from WeChat for this | HIGH -- publish policy even at MVP |
| Algorithmic recommendation without opt-out | CAC enforcement since 2022 | MEDIUM -- implement opt-out toggle |
| Cross-border data without assessment | Foreign AI service apps investigated | MEDIUM -- use domestic LLM APIs |
| Collecting excessive personal data | Apps collecting contacts/photo albums for no reason | LOW -- minimal data collection in our case |

---

## 6. Compliance Cost Estimate

### 6.1 MVP Stage (Launch)

| Item | Cost (RMB) | Notes |
|---|---|---|
| Privacy policy drafting | 5,000 - 15,000 | Can draft in-house using templates, then have lawyer review |
| Legal counsel review (1-2 hours) | 3,000 - 8,000 | Essential -- have China-qualified lawyer review |
| Amap/Tencent Maps API registration | 0 | Free for low-volume usage |
| Consent flow implementation | Development time | ~2-3 days of engineering |
| ICP Filing (备案) if hosting in China | 0 - 500 | Required for website hosting in mainland China |
| **MVP Total** | **8,000 - 23,500** | Low burden due to no accounts, optional location |

### 6.2 At Scale (Post-MVP, with accounts)

| Item | Cost (RMB) | Notes |
|---|---|---|
| Full privacy compliance audit | 30,000 - 80,000 | External law firm or compliance consultancy |
| Data Protection Officer (DPO) | 200,000 - 500,000/yr | Required at certain data processing thresholds |
| Algorithm filing (if required) | 10,000 - 30,000 | Legal fees for filing preparation |
| Security assessment / penetration testing | 20,000 - 50,000 | Periodic assessment recommended |
| Data localization infrastructure | Variable | If using foreign cloud, may need China-based infrastructure |
| Ongoing legal counsel retainer | 50,000 - 150,000/yr | For ongoing compliance questions |
| **Scale Total (annual)** | **300,000 - 800,000+** | Increases with data volume and feature complexity |

### 6.3 Certifications

| Certification | Required? | Cost | Notes |
|---|---|---|---|
| ICP Filing (ICP备案) | YES (if hosted in China) | 0-500 RMB | Required for any website hosted on mainland China servers |
| ICP License (ICP许可证) | NO (no paid services) | N/A | Only needed for e-commerce/paid services |
| Algorithm Filing | Possibly at scale | See above | Only if deemed to have "public opinion properties" |
| Level Protection (等级保护) | Possibly at scale | 50,000 - 200,000 | Cybersecurity grading; likely Level 1 or 2 |
| Privacy compliance certification | Optional | 20,000 - 50,000 | Third-party certification for trust |

---

## 7. Risk Assessment

### 7.1 Overall Regulatory Risk: LOW (at MVP stage)

The regulatory risk for this MVP is **LOW** because:
- No user accounts (simplifies data rights management)
- Location is optional (mitigates sensitive data risk)
- No e-commerce transactions (avoids payment compliance)
- Not a content/social platform (avoids content moderation obligations)
- Minimal personal data collection

### 7.2 Key Risks (in order of severity)

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **Cross-border data transfer** (using foreign LLM APIs) | Medium | Medium | Use China-hosted LLM (通义千问, DeepSeek) |
| **Location consent non-compliance** | Medium | Low | Implement separate, clear location consent; provide manual input alternative |
| **No privacy policy at launch** | High | Low | Publish policy before any data collection; link from app |
| **Amap/Tencent Maps API misuse** | Low | Low | Use official APIs, stay within TOS, attribute properly |
| **Restaurant defamation claims** | Low | Low | Frame as "matching" not "rating"; avoid negative reviews |
| **Algorithmic recommendation without opt-out** | Medium | Low | Implement "non-personalized mode" toggle |
| **Data breach** | Medium | Low | Minimize server-side storage; encrypt at rest if storing |

### 7.3 Product-Specific Risk Mitigations

1. **Design for ephemerality**: Store data in browser session (localStorage/sessionStorage) rather than server-side. This is the single most effective mitigation for a no-account MVP.

2. **Domestic LLM only**: Use 通义千问 (Alibaba), 文心一言 (Baidu), DeepSeek, or 智谱 (ZhipuAI) for the conversational AI feature. This avoids cross-border data transfer complications entirely.

3. **Consent-first design**: Show privacy policy and consent screens BEFORE any data collection. This is non-negotiable.

4. **Location fallback**: Prominently offer subway station input as an alternative to GPS. This reduces "sensitive data" processing to zero for users who choose it.

5. **Opt-out toggle**: Place a visible toggle for "personalized recommendations" -- users who opt out get generic restaurant results.

6. **BMI (Building More Intelligence)**: If using any analytics or monitoring, ensure Chinese-compliant alternatives (友盟 UMeng, 百度统计) rather than Google Analytics, which has cross-border data concerns.

---

## 8. Upcoming Changes & Trends

| Development | Timeline | Impact |
|---|---|---|
| Cross-border data transfer rules refinement | Ongoing (2024-2025 updates) | May affect foreign LLM API usage |
| Algorithm filing requirements expansion | TBD | May eventually require more platforms to file |
| AI governance law (人工智能法) | Draft stage | Will add requirements for AI-powered recommendation systems |
| Standard contract for cross-border data | In effect since 2023 | Available mechanism if cross-border transfers needed |
| MIIT app governance campaigns | Regular (quarterly batches) | Ongoing scrutiny of app permissions and privacy practices |

---

## 9. Practical Checklist: MVP Launch

- [ ] Draft privacy policy (Chinese language, accessible URL)
- [ ] Have China-qualified lawyer review privacy policy
- [ ] Implement consent flow: privacy policy acceptance before data collection
- [ ] Implement separate location consent screen (for GPS option)
- [ ] Provide manual subway station input as alternative
- [ ] Implement opt-out toggle for personalized recommendations
- [ ] Use China-hosted LLM API for AI conversation
- [ ] Register on Amap or Tencent Maps developer platform (实名认证)
- [ ] Complete ICP Filing if hosting in mainland China
- [ ] Disclose all third-party SDKs in privacy policy
- [ ] Implement session-only data storage (no persistent accounts)
- [ ] Add "delete my data" mechanism (or clear instructions)
- [ ] Provide contact method for privacy inquiries
- [ ] Test consent flow on real devices (H5 in WeChat, browser)
- [ ] No Google Analytics / foreign tracking services

---

## 10. Data Gaps

The following areas could not be verified with available sources and require further research:

| Gap | Priority | How to Resolve |
|---|---|---|
| Exact H5 vs mini-program regulatory differences | Medium | Consult China internet lawyer; CAC guidelines may differ |
| Amap/Tencent developer agreement specifics | Medium | Read current developer TOS; check data processing addendum |
| Whether "optional location + manual input" exempts from sensitive data rules entirely | Medium | Legal opinion from China-qualified lawyer |
| Food recommendation platform liability precedent | Medium | Research Chinese court cases (中国裁判文书网) |
| Latest MIIT 2025 enforcement round specifics | Low | Monitor MIIT announcements |
| Whether WeChat's WebView H5 triggers additional requirements | Low | Review WeChat mini-program platform policies |
| Exact thresholds for "large-scale" handler designation | Low | PIPL implementing regulations not yet fully published |
| Impact of AI governance law (人工智能法) draft | Low | Monitor legislative developments |

---

## References

- PIPL Wikipedia: https://en.wikipedia.org/wiki/Personal_Information_Protection_Law_of_the_People%27s_Republic_of_China
- PIPL Full Translation (Stanford DigiChina): https://digichina.stanford.edu/work/translation-personal-information-protection-law-of-the-peoples-republic-of-china-effective-nov-1-2021/
- Algorithmic Recommendation Provisions (Stanford DigiChina): https://digichina.stanford.edu/work/translation-internet-information-service-algorithmic-recommendation-management-provisions-effective-march-1-2022/

---

*Disclaimer: This is not legal advice. Consult a China-qualified lawyer for specific compliance guidance.*
