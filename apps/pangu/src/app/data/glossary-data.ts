export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: '52-Week High / Low',
    definition:
      'The highest and lowest prices at which a stock has traded during the preceding 52 weeks; widely tracked on NSE and BSE to gauge price range and momentum.',
  },
  {
    term: 'Algo Trading',
    definition:
      'Automated order execution via exchange-approved algorithms; retail API algos need broker approval.',
  },
  {
    term: 'All-Time High (ATH)',
    definition:
      'The highest price a stock or index has ever reached since listing.',
  },
  {
    term: 'Alpha',
    definition:
      'The excess return of a stock or fund over its benchmark index; positive alpha means outperformance after adjusting for risk.',
  },
  {
    term: 'Anchor Investors',
    definition:
      'Institutions allotted IPO shares a day before the issue opens, giving confidence to other investors; part of their holding carries a 30-day lock-in.',
  },
  {
    term: 'Annual General Meeting (AGM)',
    definition:
      'Yearly meeting of a listed company’s shareholders to approve results, dividends, auditor appointments and board resolutions.',
  },
  {
    term: 'Annual Report',
    definition:
      'Yearly document with a company’s financial statements, management discussion and auditor’s report; a key source for fundamental analysis.',
  },
  {
    term: 'Arbitrage',
    definition:
      'Simultaneously buying and selling the same security in different markets (e.g. NSE vs BSE, cash vs futures) to profit from price differences.',
  },
  {
    term: 'ASBA',
    definition:
      'Application Supported by Blocked Amount; IPO application money stays in the bank account and is only blocked until allotment, continuing to earn interest.',
  },
  {
    term: 'Ask Price',
    definition:
      'The lowest price at which a seller is willing to sell a security; shown on the sell side of the order book.',
  },
  {
    term: 'Asset Allocation',
    definition:
      'Dividing investments across asset classes such as equity, debt, gold and cash to balance risk and return.',
  },
  {
    term: 'Asset Management Company (AMC)',
    definition:
      'Company managing pooled investor money in mutual funds, e.g. HDFC AMC, SBI Mutual Fund; regulated by SEBI.',
  },
  {
    term: 'Auction (Exchange Auction)',
    definition:
      'Auction conducted by the exchange when a seller fails to deliver shares; buyers receive shares or close-out compensation through it.',
  },
  {
    term: 'Authorized Capital',
    definition:
      'Maximum share capital a company is legally allowed to issue, stated in its memorandum of association.',
  },
  {
    term: 'Averaging',
    definition:
      'Buying more of a stock after the price falls (averaging down) or rises (averaging up) to change the average purchase cost.',
  },
  {
    term: 'Bear Market',
    definition:
      'Prolonged period of falling prices, usually a 20%+ fall from recent highs, marked by pessimism and selling.',
  },
  {
    term: 'Beta',
    definition:
      'Measure of a stock’s volatility relative to the market; beta above 1 moves more than the market, below 1 moves less.',
  },
  {
    term: 'Bid Price',
    definition:
      'Highest price a buyer is willing to pay for a security; shown on the buy side of the order book.',
  },
  {
    term: 'Bid-Ask Spread',
    definition:
      'Difference between the bid and ask price; narrower spreads indicate more liquid stocks.',
  },
  {
    term: 'Block Deal',
    definition:
      'Single large trade of minimum 5 lakh shares or ₹10 crore executed in a special 35-minute morning window on NSE/BSE.',
  },
  {
    term: 'Blue-Chip Stocks',
    definition:
      'Shares of large, financially sound companies with long track records, e.g. Reliance, HDFC Bank, Infosys, TCS.',
  },
  {
    term: 'Bonus Issue',
    definition:
      'Free additional shares issued to existing shareholders in a fixed ratio (e.g. 1:1) by capitalising reserves; the share price adjusts proportionately.',
  },
  {
    term: 'Book Building',
    definition:
      'Price discovery process in IPOs where investors bid within a price band and the final cut-off price is set from demand.',
  },
  {
    term: 'Book Closure',
    definition:
      'Period when a company closes its register of members to determine eligibility for dividends, bonus or splits.',
  },
  {
    term: 'Book Value',
    definition:
      'Net worth of a company (assets minus liabilities) divided by outstanding shares; compared with market price via the P/B ratio.',
  },
  {
    term: 'Broker (Stockbroker)',
    definition:
      'SEBI-registered intermediary executing buy/sell orders on exchanges for investors, e.g. Zerodha, Groww, ICICI Direct.',
  },
  {
    term: 'Brokerage',
    definition:
      'Fee charged by a broker per trade; discount brokers charge flat fees (e.g. ₹20/order) while full-service brokers charge a percentage.',
  },
  {
    term: 'BSDA',
    definition:
      'Basic Services Demat Account with nil or low annual charges for small holdings up to ₹10 lakh.',
  },
  {
    term: 'BSE',
    definition:
      'Bombay Stock Exchange, Asia’s oldest exchange (1875), home to the Sensex; operates alongside NSE.',
  },
  {
    term: 'BTST (Buy Today, Sell Tomorrow)',
    definition:
      'Selling shares before they are credited to demat on T+1 settlement; allowed subject to broker RMS checks and short-delivery risk.',
  },
  {
    term: 'Bulk Deal',
    definition:
      'Trade exceeding 0.5% of a company’s listed shares, disclosed to exchanges at day-end with client names.',
  },
  {
    term: 'Bull Market',
    definition:
      'Prolonged period of rising prices driven by optimism, strong earnings and buying interest.',
  },
  {
    term: 'Buyback (Share Buyback)',
    definition:
      'Company repurchases its own shares from shareholders via tender offer or open market, usually at a premium, reducing share count.',
  },
  {
    term: 'CAGR',
    definition:
      'Compounded Annual Growth Rate; smoothed yearly growth rate of an investment over multiple years.',
  },
  {
    term: 'Candlestick Chart',
    definition:
      'Price chart using candles showing open, high, low and close for each period; the basis of most technical analysis in India.',
  },
  {
    term: 'Capital Gain',
    definition:
      'Profit from selling a security above its purchase price; taxed as STCG or LTCG in India.',
  },
  {
    term: 'CAS',
    definition:
      'Consolidated Account Statement sent monthly by NSDL/CDSL consolidating all demat holdings and mutual fund units.',
  },
  {
    term: 'Cash Segment',
    definition:
      'Equity segment where shares are bought and sold for delivery with T+1 settlement, as opposed to derivatives.',
  },
  {
    term: 'Circuit Limits',
    definition:
      'Daily price bands (e.g. 2%, 5%, 10%, 20%) beyond which trading in a stock halts; the upper circuit caps rises and the lower circuit caps falls.',
  },
  {
    term: 'Clearing Corporation',
    definition:
      'Entity guaranteeing trade settlement (NSCCL for NSE, ICCL for BSE) by becoming the counterparty to every trade.',
  },
  {
    term: 'Closing Price',
    definition:
      'Last traded price of a security in a session; NSE/BSE compute the official close using the weighted average of the last 30 minutes.',
  },
  {
    term: 'CNC (Cash and Carry)',
    definition:
      'Product type for delivery-based equity buying where shares are credited to demat on T+1.',
  },
  {
    term: 'Contract Note',
    definition:
      'Broker-issued statement confirming trade details (price, quantity, charges, taxes) sent within 24 hours of trading.',
  },
  {
    term: 'Corporate Actions',
    definition:
      'Company decisions affecting securities: dividends, bonus issues, splits, rights issues, buybacks and mergers.',
  },
  {
    term: 'Correction',
    definition:
      'Short-term fall of 10% or more in a stock or index before the primary trend resumes.',
  },
  {
    term: 'Credit Rating',
    definition:
      'Assessment of a borrower’s creditworthiness by agencies like CRISIL, ICRA and CARE; guides bond and deposit decisions.',
  },
  {
    term: 'Current Ratio',
    definition:
      'Current assets divided by current liabilities; measures short-term liquidity, with 1 or above usually comfortable.',
  },
  {
    term: 'Custodian',
    definition:
      'Institution holding securities on behalf of FIIs, mutual funds and large investors and handling settlement.',
  },
  {
    term: 'Cut-off Price',
    definition:
      'Final issue price fixed in a book-built IPO; retail investors may bid at cut-off to accept whatever price is discovered.',
  },
  {
    term: 'Day Trading (Intraday)',
    definition:
      'Buying and selling a security within the same trading session with no delivery; open positions are squared off the same day.',
  },
  {
    term: 'DDPI',
    definition:
      'Demat Debit and Pledge Instruction authorising a broker to debit sold shares; the replacement for PoA-based debit.',
  },
  {
    term: 'Death Cross',
    definition:
      'Bearish signal when the 50-day moving average falls below the 200-day moving average.',
  },
  {
    term: 'Debt-Equity Ratio',
    definition:
      'Total debt divided by shareholders’ funds; lower ratios generally mean a stronger balance sheet.',
  },
  {
    term: 'Delivery Percentage',
    definition:
      'Share of traded volume resulting in delivery; a high delivery percentage signals investor (not speculative) interest.',
  },
  {
    term: 'Delivery Trading',
    definition:
      'Taking actual delivery of shares into demat (CNC) instead of squaring off intraday.',
  },
  {
    term: 'Demat Account',
    definition:
      'Electronic account holding shares and securities in dematerialised form with NSDL or CDSL through a DP.',
  },
  {
    term: 'Dematerialisation',
    definition:
      'Converting physical share certificates into electronic form; rematerialisation is the reverse process.',
  },
  {
    term: 'Depository (NSDL/CDSL)',
    definition:
      'Organisation holding securities electronically; India’s two depositories are NSDL and CDSL.',
  },
  {
    term: 'Depository Participant (DP)',
    definition:
      'Agent of a depository (usually a broker or bank) offering demat services to investors.',
  },
  {
    term: 'DII (Domestic Institutional Investor)',
    definition:
      'Indian mutual funds, insurers and banks investing domestically; their flows often counterbalance FPI selling.',
  },
  {
    term: 'DIS / CDSL Easiest',
    definition:
      'Off-market share transfer via a delivery instruction slip or CDSL’s online Easiest facility.',
  },
  {
    term: 'Discount Broker',
    definition:
      'Low-cost broker offering execution-only platforms with flat fees, e.g. Zerodha and Upstox.',
  },
  {
    term: 'Dividend',
    definition:
      'Share of profits distributed by a company to shareholders, usually declared per share and taxable in investors’ hands.',
  },
  {
    term: 'Dividend Yield',
    definition:
      'Annual dividend per share divided by market price; a high yield can signal value or distress.',
  },
  {
    term: 'DP ID / BO ID',
    definition:
      '16-digit demat account identifier (8-digit DP ID plus 8-digit client/BO ID) used for transfers and IPO applications.',
  },
  {
    term: 'DRHP',
    definition:
      'Draft Red Herring Prospectus filed with SEBI for review before an IPO; covers business, financials and risk factors.',
  },
  {
    term: 'DVR Shares',
    definition:
      'Differential Voting Rights shares carrying fewer voting rights, usually issued at a discount to ordinary shares.',
  },
  {
    term: 'EBITDA',
    definition:
      'Earnings before interest, tax, depreciation and amortisation; measures core operating profitability.',
  },
  {
    term: 'EBITDA Margin',
    definition:
      'EBITDA as a percentage of revenue; higher margins indicate stronger pricing power and efficiency.',
  },
  {
    term: 'EPS (Earnings Per Share)',
    definition:
      'Net profit divided by outstanding shares; the core input for the P/E ratio.',
  },
  {
    term: 'Equity Shares',
    definition:
      'Ordinary shares representing ownership with voting rights and a claim on residual profits.',
  },
  {
    term: 'ESOP',
    definition:
      'Employee Stock Option Plan granting employees the right to buy company shares at a preset price after vesting.',
  },
  {
    term: 'ETF (Exchange Traded Fund)',
    definition:
      'Fund tracking an index or commodity, traded on exchanges like a stock with live prices.',
  },
  {
    term: 'Ex-Date',
    definition:
      'Date on or after which a buyer is not entitled to an announced dividend, bonus or split; the price usually adjusts.',
  },
  {
    term: 'Exchange (Stock Exchange)',
    definition:
      'Regulated marketplace for securities; India’s main exchanges are NSE and BSE.',
  },
  {
    term: 'Face Value',
    definition:
      'Nominal value of a share fixed at issuance (commonly ₹1, ₹2, ₹5 or ₹10); dividends are often declared as a percentage of face value.',
  },
  {
    term: 'Financial Year',
    definition:
      'India’s April-to-March accounting year (FY25 runs April 2024–March 2025); results follow quarterly Q1–Q4 cycles.',
  },
  {
    term: 'Float (Free Float)',
    definition:
      'Shares available for public trading excluding promoter and locked-in holdings; index weights use free-float market cap.',
  },
  {
    term: 'Floor Price',
    definition:
      'Minimum price in buyback, delisting or OFS offers, often linked to regulatory pricing formulas.',
  },
  {
    term: 'Follow-on Public Offer (FPO)',
    definition:
      'Additional share sale by an already-listed company to raise fresh capital.',
  },
  {
    term: 'FPI (Foreign Portfolio Investor)',
    definition:
      'Foreign investors registered with SEBI to invest in Indian securities; their flows move markets.',
  },
  {
    term: 'Freeze Quantity',
    definition:
      'Maximum order size per single order set by exchanges; larger orders must be sliced into multiple orders.',
  },
  {
    term: 'Fundamental Analysis',
    definition:
      'Evaluating a company via financials, business quality, management and valuation to judge intrinsic worth.',
  },
  {
    term: 'GDR',
    definition:
      'Global Depository Receipt; instrument letting foreign investors hold shares of Indian companies abroad.',
  },
  {
    term: 'Gift Nifty',
    definition:
      'Nifty futures traded at GIFT City (NSE IX), indicating pre-open direction; earlier traded in Singapore as SGX Nifty.',
  },
  {
    term: 'Golden Crossover',
    definition:
      'Bullish signal when the 50-day moving average crosses above the 200-day moving average.',
  },
  {
    term: 'Green Shoe Option',
    definition:
      'Oversubscription option letting IPO bankers sell up to 15% extra shares to stabilise the listing-day price.',
  },
  {
    term: 'Grey Market Premium (GMP)',
    definition:
      'Unofficial premium at which IPO shares trade before listing; an informal gauge of listing expectations, not regulated.',
  },
  {
    term: 'Haircut',
    definition:
      'Discount applied to pledged securities’ value when computing margins; volatile stocks carry higher haircuts.',
  },
  {
    term: 'Hedging',
    definition:
      'Taking offsetting positions (e.g. buying puts against holdings) to reduce downside risk.',
  },
  {
    term: 'Impact Cost',
    definition:
      'Cost of executing a large order measured by the price movement it causes; SEBI uses it to judge stock liquidity.',
  },
  {
    term: 'Index',
    definition:
      'Basket tracking a market segment, e.g. Nifty 50, Sensex, Nifty Bank; the basis for index funds and ETFs.',
  },
  {
    term: 'India VIX',
    definition:
      'Volatility index of NSE indicating expected 30-day market swings; rises with fear and falls with calm.',
  },
  {
    term: 'Insider Trading',
    definition:
      'Trading on unpublished price-sensitive information by insiders; illegal in India under SEBI (PIT) Regulations.',
  },
  {
    term: 'Institutional Investors',
    definition:
      'Large investors like mutual funds, insurers (DIIs) and FPIs whose flows drive markets.',
  },
  {
    term: 'IPO',
    definition:
      'First sale of shares to the public, listing the company on exchanges after SEBI clearance and price discovery.',
  },
  {
    term: 'IPO Allotment',
    definition:
      'Allocation of IPO shares to applicants by lottery (retail) or on a proportionate basis when oversubscribed.',
  },
  {
    term: 'IPO Lot Size',
    definition:
      'Minimum shares one must apply for in an IPO, fixed so that a retail application stays near ₹10,000–15,000.',
  },
  {
    term: 'ISIN',
    definition:
      '12-character code uniquely identifying a security (INE-prefixed for India), used in demat transfers.',
  },
  {
    term: 'Issue Price',
    definition: 'Final per-share price fixed for an IPO or FPO.',
  },
  {
    term: 'Joint Holding',
    definition:
      'Demat account or holding owned by two or more holders, operated jointly or by anyone-or-survivor.',
  },
  {
    term: 'KYC',
    definition:
      'Know Your Customer verification (PAN, Aadhaar, bank proof) mandatory before trading, done via CKYC/KRA.',
  },
  {
    term: 'Large-Cap / Mid-Cap / Small-Cap',
    definition:
      'SEBI ranks listed firms by market cap: top 100 are large-cap, 101–250 mid-cap, the rest small-cap.',
  },
  {
    term: 'Leverage',
    definition:
      'Using borrowed funds or margins to enlarge positions; magnifies both gains and losses.',
  },
  {
    term: 'Limit Order',
    definition:
      'Order executed only at the specified price or better, unlike market orders that execute immediately.',
  },
  {
    term: 'Liquidity',
    definition:
      'Ease of buying or selling without moving the price; high-volume Nifty stocks are highly liquid.',
  },
  {
    term: 'Listing',
    definition:
      'Admission of shares for trading on an exchange after IPO compliance.',
  },
  {
    term: 'Listing Gains',
    definition:
      'Profit when shares debut above the issue price on listing day.',
  },
  {
    term: 'Long Position',
    definition:
      'Owning a security (or buying futures/calls) expecting prices to rise.',
  },
  {
    term: 'Lower Circuit',
    definition:
      'Maximum permitted fall in a stock for the day under circuit limits; trading halts when hit.',
  },
  {
    term: 'LTCG',
    definition:
      'Long-Term Capital Gains; equity gains on holdings beyond 12 months above the ₹1.25 lakh yearly exemption, taxed at 12.5%.',
  },
  {
    term: 'Margin',
    definition:
      'Upfront funds blocked for leveraged or derivatives trades (SPAN, exposure and VAR margins).',
  },
  {
    term: 'Margin Trading Facility (MTF)',
    definition:
      'Broker-funded leveraged delivery trades where shares stay pledged until paid for.',
  },
  {
    term: 'Market Capitalisation',
    definition:
      'Share price multiplied by outstanding shares; classifies companies into large, mid and small-cap.',
  },
  {
    term: 'Market Maker',
    definition:
      'Participant quoting buy and sell prices to provide liquidity, common in SME and illiquid scrips.',
  },
  {
    term: 'Market Order',
    definition:
      'Order executed immediately at the best available price; may slip in volatile or illiquid stocks.',
  },
  {
    term: 'Moving Average',
    definition:
      'Average closing price over N days (SMA/EMA) smoothing trends; 50/200-day crossovers signal momentum shifts.',
  },
  {
    term: 'Multibagger',
    definition:
      'Stock returning multiples of invested capital (2x, 5x, 10x and more) over a holding period.',
  },
  {
    term: 'Mutual Fund',
    definition:
      'SEBI-regulated pooled vehicle investing across stocks and bonds, managed by AMCs; units carry NAV-based pricing.',
  },
  {
    term: 'Net Profit (PAT)',
    definition:
      'Profit after all expenses, interest, depreciation and tax; the bottom line of the profit-and-loss statement.',
  },
  {
    term: 'Net Profit Margin',
    definition:
      'Net profit as a percentage of revenue; shows overall profitability.',
  },
  {
    term: 'Nifty 50',
    definition:
      'NSE’s 50-stock flagship index spanning 13+ sectors; India’s most tracked benchmark.',
  },
  {
    term: 'Nominee (Demat Nominee)',
    definition:
      'Person designated to receive securities on the holder’s death; nomination is now mandatory for demat accounts.',
  },
  {
    term: 'NSE',
    definition:
      'National Stock Exchange of India; the largest exchange by volume, home to Nifty indices, fully electronic since 1994.',
  },
  {
    term: 'Offer Document',
    definition:
      'Prospectus or RHP containing all issue details; the basis of informed IPO decisions.',
  },
  {
    term: 'Offer for Sale (OFS)',
    definition:
      'Exchange-window mechanism for promoters to sell stakes, usually at a discount with retail reservation.',
  },
  {
    term: 'Opening Price',
    definition:
      'First traded price of a session, discovered in the 9:00–9:15 pre-open call auction on NSE/BSE.',
  },
  {
    term: 'Operating Margin',
    definition:
      'Operating profit as a percentage of revenue; reflects core business efficiency.',
  },
  {
    term: 'Order Book',
    definition:
      'Live list of buy (bid) and sell (ask) orders with quantities at each price level.',
  },
  {
    term: 'Oversubscribed',
    definition:
      'IPO applications exceeding shares on offer, e.g. 10x subscription; triggers lottery allotment for retail.',
  },
  {
    term: 'P/B Ratio',
    definition:
      'Market price divided by book value per share; below 1 can indicate undervaluation or stress.',
  },
  {
    term: 'P/E Ratio',
    definition:
      'Market price divided by EPS; gauges how much investors pay per rupee of earnings versus peers and history.',
  },
  {
    term: 'Paid-up Capital',
    definition:
      'Portion of authorised capital actually issued and paid for by shareholders.',
  },
  {
    term: 'Penny Stocks',
    definition:
      'Very low-priced, illiquid stocks prone to manipulation; high risk for retail investors.',
  },
  {
    term: 'Pledge (Shares)',
    definition:
      'Using demat holdings as collateral for margin or loans via CDSL/NSDL pledge; invocation on default hurts prices.',
  },
  {
    term: 'Portfolio',
    definition:
      'Collection of all investments held; diversification across assets manages risk.',
  },
  {
    term: 'Pre-Open Session',
    definition:
      '9:00–9:15 call auction discovering the opening price before continuous trading.',
  },
  {
    term: 'Price Band',
    definition:
      'Minimum-maximum range for IPO bidding in book building, e.g. ₹90–₹95.',
  },
  {
    term: 'Primary Market',
    definition:
      'Market for new securities (IPOs, FPOs, rights issues) where money flows to the issuer.',
  },
  {
    term: 'Promoter',
    definition:
      'Founders and controlling shareholders; promoter holding and pledging signal skin-in-the-game and risk.',
  },
  {
    term: 'QIB / NII / RII',
    definition:
      'IPO investor categories: Qualified Institutional Buyers (~50%), Non-Institutional/HNI (~15%) and Retail (~35%), each with distinct allotment rules.',
  },
  {
    term: 'Quarterly Results',
    definition:
      'Listed companies report Q1–Q4 results within 45 days of quarter-end; earnings seasons move prices.',
  },
  {
    term: 'Quote (LTP / Bid / Ask)',
    definition:
      'Live price snapshot: last traded price with best buy/sell levels and volumes.',
  },
  {
    term: 'Record Date',
    definition:
      'Cut-off date fixing shareholder eligibility for dividends, bonus issues, splits and rights.',
  },
  {
    term: 'Red Herring Prospectus (RHP)',
    definition:
      'Final IPO prospectus filed with the RoC carrying the price band and dates; the DRHP is its SEBI-review draft.',
  },
  {
    term: 'Registrar (RTA)',
    definition:
      'Agency handling IPO allotment, refunds and shareholder records, e.g. Link Intime and KFintech.',
  },
  {
    term: 'Resistance',
    definition:
      'Price ceiling where selling emerges; a breakout above it often signals further upside.',
  },
  {
    term: 'Rights Entitlement (RE)',
    definition:
      'Tradable entitlement credited before a rights issue; it can be sold on exchanges or allowed to lapse.',
  },
  {
    term: 'Rights Issue',
    definition:
      'New shares offered first to existing shareholders, usually at a discount, in proportion to holdings.',
  },
  {
    term: 'ROCE',
    definition:
      'Return on Capital Employed; operating profit over capital employed, measuring capital efficiency.',
  },
  {
    term: 'ROE',
    definition:
      'Return on Equity; net profit over shareholders’ funds, measuring shareholder returns.',
  },
  {
    term: 'Rolling Settlement (T+1)',
    definition:
      'Indian trades settle one working day after execution with actual share and fund transfer.',
  },
  {
    term: 'RSI',
    definition:
      'Relative Strength Index; momentum oscillator from 0–100 where above 70 suggests overbought and below 30 oversold.',
  },
  {
    term: 'SEBI',
    definition:
      'Securities and Exchange Board of India; market regulator licensing brokers, clearing corporations and mutual funds, and policing fraud.',
  },
  {
    term: 'Secondary Market',
    definition:
      'Exchange trading of already-issued securities between investors; prices are set by demand and supply.',
  },
  {
    term: 'Sectoral Indices',
    definition:
      'Indices tracking industries (Bank Nifty, IT, Pharma, Auto) for sector bets and benchmarking.',
  },
  {
    term: 'Sensex',
    definition:
      'BSE’s 30-stock benchmark index, India’s oldest, tracking large-cap leaders.',
  },
  {
    term: 'Settlement',
    definition:
      'Exchange of shares and funds completing a trade (T+1 in India) via clearing corporations.',
  },
  {
    term: 'Shareholder',
    definition:
      'Owner of company shares with rights to dividends, voting and corporate benefits.',
  },
  {
    term: 'Short Covering',
    definition:
      'Buying back borrowed or shorted positions, often accelerating rallies.',
  },
  {
    term: 'Short Selling',
    definition:
      'Selling borrowed shares expecting to buy back cheaper; intraday shorting needs no borrowing, overnight does.',
  },
  {
    term: 'STCG',
    definition:
      'Short-Term Capital Gains; equity gains on holdings up to 12 months, taxed at 20% plus surcharge and cess.',
  },
  {
    term: 'Stop-Loss Order',
    definition:
      'Pre-set exit triggered at a trigger price to cap losses; SL-M executes at market, SL at a limit price.',
  },
  {
    term: 'Strike Price',
    definition:
      'Fixed price at which an option can be exercised; traders pick strikes around spot via the option chain.',
  },
  {
    term: 'STT',
    definition:
      'Securities Transaction Tax levied on equity delivery and F&O trades; rates differ by segment and side.',
  },
  {
    term: 'Support',
    definition:
      'Price floor where buying emerges; a breakdown below it often signals further downside.',
  },
  {
    term: 'Swing Trading',
    definition:
      'Holding positions for days to weeks to capture short-term price swings.',
  },
  {
    term: 'Tick Size',
    definition:
      'Minimum price movement (₹0.05 for most NSE equities); orders must be in tick multiples.',
  },
  {
    term: 'Trading Account',
    definition:
      'Broker account used to place buy/sell orders, linked to demat and bank accounts.',
  },
  {
    term: 'Trading Holiday',
    definition:
      'Exchange-closed days (weekends plus the NSE/BSE holiday calendar); positions carry overnight risk across them.',
  },
  {
    term: 'UCC (Unique Client Code)',
    definition:
      'Exchange-issued trading ID mapped to PAN; one per broker relationship, used in contract notes and compliance.',
  },
  {
    term: 'Unlisted Shares',
    definition:
      'Shares of companies not on exchanges, traded OTC or on pre-IPO platforms with low liquidity and high risk.',
  },
  {
    term: 'UPI Mandate (IPO)',
    definition:
      'Retail investors accept a UPI collect request to block IPO application funds up to ₹5 lakh under ASBA.',
  },
  {
    term: 'Upper Circuit',
    definition:
      'Maximum permitted rise in a stock for the day under circuit limits; trading halts when hit.',
  },
  {
    term: 'Valuation',
    definition:
      'Estimating a company’s worth via multiples (P/E, EV/EBITDA), DCF or peers before investing.',
  },
  {
    term: 'Value Investing',
    definition:
      'Buying fundamentally strong stocks below intrinsic value with a margin of safety.',
  },
  {
    term: 'Volatility',
    definition:
      'Degree of price fluctuation; India VIX quantifies expected Nifty volatility.',
  },
  {
    term: 'Volume',
    definition:
      'Shares traded in a period; rising volume confirms price moves while thin volume warns of traps.',
  },
  {
    term: 'VWAP',
    definition:
      'Volume Weighted Average Price; institutional benchmark for execution quality and delivery analytics.',
  },
  {
    term: 'Warrant',
    definition:
      'Company-issued right to buy shares at a set price later, often attached to preferential issues.',
  },
];
