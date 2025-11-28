import { useState, useMemo, useRef, useEffect } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Minus, Receipt, Sparkles, Database, Brain, Filter, Upload, Loader2, Download, Share2, GitCompare } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface RetrievedDoc {
  medicine: string;
  price: string;
  company: string;
  packing: string;
  relevance: number;
}

interface MedicineInBill extends RetrievedDoc {
  quantity: number;
}

interface SearchResult {
  answer: string;
  retrievedDocs: RetrievedDoc[];
  confidence: number;
  reasoning: string;
  searchMethod: 'semantic' | 'fuzzy' | 'gemini';
}

export default function KnowledgeAgent() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [bill, setBill] = useState<MedicineInBill[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedPacking, setSelectedPacking] = useState<string>("all");
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [compareItems, setCompareItems] = useState<RetrievedDoc[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // LangChain snippet for KnowledgeAgent
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on KnowledgeAgent page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (knowledge agent)", err);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a medicine name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-agent", {
        body: { query, sessionId: crypto.randomUUID() },
      });

      if (error) throw error;

      setResult(data);
      toast.success("Medicine information retrieved");
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error(error.message || "Failed to search medicines");
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingPrescription(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Extract medicine names from prescription
        const { data, error } = await supabase.functions.invoke("prescription-reader", {
          body: { imageBase64: base64 },
        });

        if (error) throw error;

        const medicines = data.medicines as string[];
        
        if (medicines.length === 0) {
          toast.error("No medicines found in the prescription image");
          return;
        }

        toast.success(`Found ${medicines.length} medicine(s) in prescription`);

        // Set the first medicine in search and trigger search
        if (medicines.length > 0) {
          setQuery(medicines[0]);
          
          // Trigger search for the first medicine
          try {
            const { data: searchData, error: searchError } = await supabase.functions.invoke("knowledge-agent", {
              body: { query: medicines[0], sessionId: crypto.randomUUID() },
            });

            if (searchError) throw searchError;
            setResult(searchData);
          } catch (err) {
            console.error(`Failed to search for ${medicines[0]}:`, err);
          }
        }

        // Search and add each medicine to the bill
        for (const medicineName of medicines) {
          try {
            const { data: searchData, error: searchError } = await supabase.functions.invoke("knowledge-agent", {
              body: { query: medicineName, sessionId: crypto.randomUUID() },
            });

            if (searchError) throw searchError;

            // Add the top match to the bill if found
            if (searchData.retrievedDocs && searchData.retrievedDocs.length > 0) {
              const topMatch = searchData.retrievedDocs[0];
              if (topMatch.relevance > 60) { // Only add if reasonable match
                addToBill(topMatch);
              }
            }
          } catch (err) {
            console.error(`Failed to search for ${medicineName}:`, err);
          }
        }
      };

      reader.onerror = () => {
        throw new Error("Failed to read image file");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Prescription upload error:", error);
      toast.error(error.message || "Failed to process prescription");
    } finally {
      setUploadingPrescription(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addToBill = (doc: RetrievedDoc) => {
    const existing = bill.find((item) => item.medicine === doc.medicine);
    if (existing) {
      setBill(
        bill.map((item) =>
          item.medicine === doc.medicine
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setBill([...bill, { ...doc, quantity: 1 }]);
    }
    toast.success(`${doc.medicine} added to bill`);
  };

  const removeFromBill = (medicine: string) => {
    setBill(bill.filter((item) => item.medicine !== medicine));
    toast.info("Removed from bill");
  };

  const updateQuantity = (medicine: string, delta: number) => {
    setBill(
      bill
        .map((item) =>
          item.medicine === medicine
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const calculateTotal = () => {
    return bill.reduce((total, item) => {
      const priceMatch = item.price.match(/[\d,]+/);
      const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, "")) : 0;
      return total + price * item.quantity;
    }, 0);
  };

  const exportBillAsPDF = () => {
    if (bill.length === 0) {
      toast.error("No medicines in bill to export");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text("Medicine Bill", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });
    
    // Line
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);
    
    // Bill items
    let yPos = 45;
    doc.setFontSize(12);
    
    bill.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      // Medicine name
      doc.setFont(undefined, "bold");
      doc.text(`${index + 1}. ${item.medicine}`, 20, yPos);
      yPos += 6;
      
      // Details
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`   Company: ${item.company}`, 20, yPos);
      yPos += 5;
      doc.text(`   Packing: ${item.packing}`, 20, yPos);
      yPos += 5;
      
      const priceMatch = item.price.match(/[\d,]+/);
      const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, "")) : 0;
      const subtotal = price * item.quantity;
      
      doc.text(`   Price: ${item.price} PKR x ${item.quantity} = ${subtotal.toLocaleString()} PKR`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
    });
    
    // Total
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`Total: ${calculateTotal().toLocaleString()} PKR`, pageWidth - 20, yPos, { align: "right" });
    
    // Footer
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("Pharmacy Contact: +92-XXX-XXXXXXX", 20, yPos);
    doc.text("Generated by SehatVerse Medicine Knowledge Agent", 20, yPos + 5);
    
    // Save
    doc.save(`medicine-bill-${new Date().getTime()}.pdf`);
    toast.success("Bill exported as PDF");
  };

  const shareViaWhatsApp = () => {
    if (bill.length === 0) {
      toast.error("No medicines in bill to share");
      return;
    }

    let message = "*Medicine Bill*\n";
    message += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    bill.forEach((item, index) => {
      const priceMatch = item.price.match(/[\d,]+/);
      const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, "")) : 0;
      const subtotal = price * item.quantity;
      
      message += `${index + 1}. *${item.medicine}*\n`;
      message += `   Company: ${item.company}\n`;
      message += `   Packing: ${item.packing}\n`;
      message += `   ${item.price} PKR x ${item.quantity} = ${subtotal.toLocaleString()} PKR\n\n`;
    });
    
    message += `*Total: ${calculateTotal().toLocaleString()} PKR*\n\n`;
    message += "Pharmacy Contact: +92-XXX-XXXXXXX\n";
    message += "_Generated by SehatVerse_";
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Opening WhatsApp...");
  };

  const getSearchMethodIcon = (method: string) => {
    switch (method) {
      case 'gemini':
        return <Sparkles className="w-4 h-4" />;
      case 'fuzzy':
        return <Brain className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getSearchMethodLabel = (method: string) => {
    switch (method) {
      case 'gemini':
        return 'AI Search';
      case 'fuzzy':
        return 'Fuzzy Match';
      default:
        return 'Exact Match';
    }
  };

  // Extract unique companies and packing types from results
  const { companies, packingTypes } = useMemo(() => {
    if (!result?.retrievedDocs) return { companies: [], packingTypes: [] };
    
    const companiesSet = new Set(result.retrievedDocs.map(doc => doc.company));
    const packingSet = new Set(result.retrievedDocs.map(doc => doc.packing));
    
    return {
      companies: Array.from(companiesSet).sort(),
      packingTypes: Array.from(packingSet).sort()
    };
  }, [result]);

  // Filter retrieved documents based on selections
  const filteredDocs = useMemo(() => {
    if (!result?.retrievedDocs) return [];
    
    return result.retrievedDocs.filter(doc => {
      const companyMatch = selectedCompany === "all" || doc.company === selectedCompany;
      const packingMatch = selectedPacking === "all" || doc.packing === selectedPacking;
      return companyMatch && packingMatch;
    });
  }, [result, selectedCompany, selectedPacking]);

  const toggleCompareItem = (doc: RetrievedDoc) => {
    setCompareItems(prev => {
      const exists = prev.find(item => item.medicine === doc.medicine);
      if (exists) {
        return prev.filter(item => item.medicine !== doc.medicine);
      } else {
        if (prev.length >= 4) {
          toast.error("You can compare up to 4 medicines at once");
          return prev;
        }
        return [...prev, doc];
      }
    });
  };

  const isInCompare = (medicine: string) => {
    return compareItems.some(item => item.medicine === medicine);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex justify-end">
          <BackButton to="/dashboard" label="Back to Dashboard" />
        </div>
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Medicine Knowledge Agent</h1>
          <p className="text-muted-foreground">Search Pakistani medicine prices with AI-powered fuzzy matching</p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                placeholder="Search medicine (e.g., Panadol, Paracetamol, Amoxicillin...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePrescriptionUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPrescription}
                variant="outline"
                className="w-full gap-2"
              >
                {uploadingPrescription ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Prescription...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Prescription Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results */}
          <div className="lg:col-span-2 space-y-4">
            {loading && (
              <Card className="p-6 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </Card>
            )}

            {result && !loading && (
              <>
                {/* AI Answer */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <div className="flex items-start gap-3 mb-3">
                    {getSearchMethodIcon(result.searchMethod)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="gap-1">
                          {getSearchMethodLabel(result.searchMethod)}
                        </Badge>
                        <Badge variant="secondary">
                          {result.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-foreground leading-relaxed">{result.answer}</p>
                </Card>

                {/* Filters */}
                {result.retrievedDocs.length > 0 && (
                  <Card className="p-4 bg-card/30 backdrop-blur">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm text-foreground">Filter Results</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Company</label>
                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="All Companies" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="all">All Companies</SelectItem>
                            {companies.map(company => (
                              <SelectItem key={company} value={company}>{company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Packing Type</label>
                        <Select value={selectedPacking} onValueChange={setSelectedPacking}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="All Packing Types" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="all">All Packing Types</SelectItem>
                            {packingTypes.map(packing => (
                              <SelectItem key={packing} value={packing}>{packing}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(selectedCompany !== "all" || selectedPacking !== "all") && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Showing {filteredDocs.length} of {result.retrievedDocs.length} results
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedCompany("all");
                            setSelectedPacking("all");
                          }}
                          className="h-7 text-xs"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                    {compareItems.length > 0 && (
                      <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <GitCompare className="h-4 w-4" />
                              Compare ({compareItems.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Compare Medicines</DialogTitle>
                            </DialogHeader>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Property</TableHead>
                                  {compareItems.map((item, idx) => (
                                    <TableHead key={idx}>{item.medicine}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">Price</TableCell>
                                  {compareItems.map((item, idx) => (
                                    <TableCell key={idx}>{item.price}</TableCell>
                                  ))}
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Company</TableCell>
                                  {compareItems.map((item, idx) => (
                                    <TableCell key={idx}>{item.company}</TableCell>
                                  ))}
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Packing</TableCell>
                                  {compareItems.map((item, idx) => (
                                    <TableCell key={idx}>{item.packing}</TableCell>
                                  ))}
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Relevance</TableCell>
                                  {compareItems.map((item, idx) => (
                                    <TableCell key={idx}>{item.relevance}%</TableCell>
                                  ))}
                                </TableRow>
                              </TableBody>
                            </Table>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </Card>
                )}

                {/* Retrieved Documents */}
                {filteredDocs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Retrieved Medicines
                    </h3>
                    {filteredDocs.map((doc, idx) => (
                      <Card
                        key={idx}
                        className="p-4 hover:shadow-md transition-shadow bg-card/50 backdrop-blur"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isInCompare(doc.medicine)}
                            onCheckedChange={() => toggleCompareItem(doc)}
                            className="mt-1"
                          />
                          <div className="flex items-start justify-between gap-4 flex-1">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{doc.medicine}</h4>
                                <Badge
                                  variant={doc.relevance > 80 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {doc.relevance}% match
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Price:</span>{" "}
                                  <span className="font-medium text-foreground">{doc.price} PKR</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Company:</span>{" "}
                                  <span className="text-foreground">{doc.company}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Packing:</span>{" "}
                                  <span className="text-foreground">{doc.packing}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addToBill(doc)}
                              className="gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add to Bill
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* No results after filtering */}
                {result.retrievedDocs.length > 0 && filteredDocs.length === 0 && (
                  <Card className="p-8 text-center border-dashed">
                    <Filter className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      No medicines match the selected filters
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setSelectedCompany("all");
                        setSelectedPacking("all");
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </Card>
                )}
              </>
            )}

            {!result && !loading && (
              <Card className="p-12 text-center border-dashed">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Search for medicines to see results with AI-powered matching
                </p>
              </Card>
            )}
          </div>

          {/* Bill Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6 bg-gradient-to-br from-card to-primary/5 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Estimated Bill</h3>
              </div>
              <Separator className="mb-4" />

              {bill.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No medicines added yet
                </p>
              ) : (
                <div className="space-y-4">
                  {bill.map((item) => (
                    <div key={item.medicine} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{item.medicine}</p>
                          <p className="text-xs text-muted-foreground">{item.price} PKR</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromBill(item.medicine)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.medicine, -1)}
                          className="h-7 w-7 p-0"
                        >
                          -
                        </Button>
                        <span className="text-sm font-medium w-8 text-center text-foreground">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.medicine, 1)}
                          className="h-7 w-7 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-foreground">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {calculateTotal().toLocaleString()} PKR
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={exportBillAsPDF}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </Button>
                    <Button
                      onClick={shareViaWhatsApp}
                      variant="secondary"
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setBill([]);
                      toast.info("Bill cleared");
                    }}
                  >
                    Clear Bill
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
