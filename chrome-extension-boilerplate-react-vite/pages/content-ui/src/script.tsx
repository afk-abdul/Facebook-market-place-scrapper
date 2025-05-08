import React, { useState, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './components/ui/pagination';
import * as XLSX from 'xlsx';

interface Product {
  title: string;
  price: string;
  sectionType: string;
  location: string;
  listingDate: string;
  unitDetails: string;
  contactInfo: string;
  description: string;
  sellerName: string;
  sellerProfile: string;
  listingLink: string;
  latitude: string;
  longitude: string;
}

const ITEMS_PER_PAGE = 10;

const extractProductDetails = async () => {
  const parentElement = document.querySelector('.xyamay9.x1pi30zi.x18d9i69.x1swvt13');
  if (!parentElement) {
    console.warn('Product details parent element not found.');
    return null;
  }

  const childNodes = parentElement.childNodes;
  const textContents = Array.from(childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)
    .map(node => (node.textContent ? node.textContent.trim() : ''))
    .filter(text => text);

  const title = textContents[0] || 'N/A';
  const price = textContents[1] || 'N/A';
  const sectionType = textContents[2] || 'N/A';

  return { title, price, sectionType };
};

const extractDescription = async () => {
  let spanElements = document.getElementsByClassName(
    'x193iq5w xeuugli x13faqbe x1vvkbs x1xmvt09 x6prxxf xvq8zen x1s688f xzsf02u',
  );
  let seeMoreSpan = null;
  let alreadyExpanded = false;

  for (let i = 0; i < spanElements.length; i++) {
    let span = spanElements[i];
    let spanText = span.textContent ? span.textContent.trim().toLowerCase() : '';
    if (spanText === 'see less') {
      alreadyExpanded = true;
      break;
    }
    if (spanText === 'see more') {
      seeMoreSpan = span;
      break;
    }
  }

  if (seeMoreSpan && !alreadyExpanded) {
    (seeMoreSpan as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const parentDiv = document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a');
  const spanElement = parentDiv?.querySelector('span');
  return spanElement && spanElement.textContent ? spanElement.textContent.trim() : 'N/A';
};

const extractLocation = () => {
  const el = document.getElementsByClassName('x889kno x1pi30zi x1a8lsjc x1swvt13');
  const parentDivLoc = el[2];
  let location = 'Unknown';

  if (parentDivLoc) {
    const spans = parentDivLoc.querySelectorAll('span');
    const spanTexts = Array.from(spans).map(span => (span.textContent ? span.textContent.trim() : ''));
    location = spanTexts[0] || 'Unknown';
  }

  return location;
};

const extractSellerDetails = async () => {
  // Find and click seller details link
  const elements = document.getElementsByClassName(
    'x9f619 x1ja2u2z x78zum5 x2lah0s x1n2onr6 x1qughib x1qjc9v5 xozqiw3 x1q0g3np',
  );
  let sellerName = 'Unknown';
  let sellerProfile = 'Unknown';
  let linkClicked = false;

  Array.from(elements).forEach(element => {
    const anchorTags = element.querySelectorAll('a');
    anchorTags.forEach(anchor => {
      if (anchor.getAttribute('aria-label') === 'Seller details' && !linkClicked) {
        sellerName = anchor.textContent ? anchor.textContent.trim() : 'Unknown';
        sellerProfile = anchor.href;
        linkClicked = true;
        anchor.click();
      }
    });
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Extract additional seller details from the new page
  const nameElement = document.querySelector(
    '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x14qwyeo.xw06pyt.x579bpy.xjkpybl.x1xlr1w8.xzsf02u.x1yc453h',
  );
  if (nameElement) {
    sellerName = nameElement?.textContent?.trim() || 'Unknown';
  }

  return { sellerName, sellerProfile };
};

const Scraper: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [interval, setInterval] = useState(5);
  const [limit, setLimit] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processedNodes] = useState(new Set());

  const processListings = useCallback(async () => {
    const parentDiv = document.getElementsByClassName(
      'x8gbvx8 x78zum5 x1q0g3np x1a02dak x1nhvcw1 x1rdy4ex xcud41i x4vbgl9 x139jcc6',
    )[0];

    if (!parentDiv) {
      console.warn('Parent div not found.');
      return false;
    }

    const childNodes = Array.from(parentDiv.children);
    let hasUnprocessedChildren = false;

    for (const child of childNodes) {
      if (processedNodes.has(child)) continue;
      processedNodes.add(child);
      hasUnprocessedChildren = true;

      const linkElement = child.querySelector('a[href]');
      if (!linkElement) continue;

      try {
        // Store the current listing URL
        const listingLink = window.location.href;

        // Navigate to product page
        (linkElement as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract all product details
        const productDetails = await extractProductDetails();
        const description = await extractDescription();
        const location = extractLocation();
        const { sellerName, sellerProfile } = await extractSellerDetails();

        if (productDetails) {
          setProducts(prev => [
            ...prev,
            {
              ...productDetails,
              description,
              location,
              sellerName,
              sellerProfile,
              listingLink,
              listingDate: 'Unknown',
              unitDetails: 'Unknown',
              contactInfo: 'Unknown',
              latitude: 'Unknown',
              longitude: 'Unknown',
            },
          ]);
        }

        // Go back to listings page
        window.history.back();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error processing listing:', error);
      }
    }

    return hasUnprocessedChildren;
  }, [processedNodes]);

  const validateInputs = (): boolean => {
    if (interval < 1) {
      setError('Scraping interval must be at least 1 second');
      return false;
    }
    if (interval > 60) {
      setError('Scraping interval cannot exceed 60 seconds');
      return false;
    }
    if (limit < 1) {
      setError('Scraping limit must be at least 1');
      return false;
    }
    if (limit > 1000) {
      setError('Scraping limit cannot exceed 1000');
      return false;
    }
    setError(null);
    return true;
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setInterval(isNaN(value) ? 0 : value);
    setError(null);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setLimit(isNaN(value) ? 0 : value);
    setError(null);
  };

  const startScraping = async () => {
    if (!validateInputs()) return;

    setIsScraping(true);
    setProgress(0);
    setCurrentProductIndex(0);
    setProducts([]);
    setError(null);

    try {
      let continueScraping = true;
      let totalProcessed = 0;

      while (continueScraping && totalProcessed < limit) {
        const hasMore = await processListings();
        if (!hasMore) break;

        totalProcessed++;
        setCurrentProductIndex(totalProcessed);
        setProgress((totalProcessed / limit) * 100);

        await new Promise(resolve => setTimeout(resolve, interval * 1000));
      }
    } catch (error) {
      setError('An error occurred during scraping. Please try again.');
      console.error('Error during scraping:', error);
    } finally {
      setIsScraping(false);
      setProgress(100);
    }
  };
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'marketplace_products.xlsx');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Facebook Marketplace Scraper</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="interval">Scraping Interval (seconds)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="60"
                value={interval}
                onChange={handleIntervalChange}
                placeholder="Enter interval (1-60 seconds)"
                className="w-full"
                disabled={isScraping}
              />
              <p className="text-sm text-gray-500">Time to wait between scraping each product (1-60 seconds)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Scraping Limit</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={handleLimitChange}
                placeholder="Enter limit (1-1000 products)"
                className="w-full"
                disabled={isScraping}
              />
              <p className="text-sm text-gray-500">Maximum number of products to scrape (1-1000)</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 mb-6">
            <Button onClick={startScraping} disabled={isScraping || !!error} className="w-32">
              {isScraping ? 'Scraping...' : 'Start Scraping'}
            </Button>
            <Button onClick={exportToExcel} disabled={products.length === 0} className="w-32">
              Export to CSV
            </Button>
          </div>

          <div className="space-y-2 mb-6">
            <Progress value={progress} />
            {isScraping && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  Scraped {currentProductIndex} of {limit} products
                </span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Section Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Seller Name</TableHead>
                <TableHead>Seller Profile</TableHead>
                <TableHead>Listing Link</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>{product.title}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>{product.sectionType}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.location}</TableCell>
                  <TableCell>{product.sellerName}</TableCell>
                  <TableCell>
                    <a
                      href={product.sellerProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline">
                      View Profile
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={product.listingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline">
                      View Listing
                    </a>
                  </TableCell>
                  <TableCell>{product.latitude}</TableCell>
                  <TableCell>{product.longitude}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {products.length > 0 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)} />
                  </PaginationItem>

                  {currentPage > 2 && (
                    <>
                      <PaginationItem>
                        <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                      </PaginationItem>
                      {currentPage > 3 && <PaginationEllipsis />}
                    </>
                  )}

                  {renderPaginationItems()}

                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <PaginationEllipsis />}
                      <PaginationItem>
                        <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    {currentPage !== totalPages && <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Scraper;
