import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  FileText,
  Download,
  Trash2,
  Calendar,
  User as UserIcon,
  Building,
  X,
  Eye,
  Search,
  FileImage,
  File,
  Share2,
  Edit,
  Filter,
  WifiOff,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

const recordSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  doctor_name: z.string().max(100, "Doctor name too long").optional(),
  facility_name: z.string().max(200, "Facility name too long").optional(),
});

interface HealthRecord {
  id: string;
  record_type: string;
  title: string;
  description: string | null;
  date: string;
  doctor_name: string | null;
  facility_name: string | null;
  document_url: string | null;
  created_at: string;
}

const HealthRecords = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HealthRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
    type: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [sharingRecord, setSharingRecord] = useState<HealthRecord | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  // Form fields
  const [recordType, setRecordType] = useState<string>("consultation");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [doctorName, setDoctorName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await loadRecords(session.user.id);
    setLoading(false);
  };

  const loadRecords = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (error) {
      console.error("Error loading records:", error);
      toast({
        title: "Error",
        description: "Failed to load health records",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let filtered = records;

    // Apply filter by type
    if (selectedFilter !== "all") {
      filtered = filtered.filter((record) => record.record_type === selectedFilter);
    }

    // Apply search
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(query) ||
          record.description?.toLowerCase().includes(query) ||
          record.doctor_name?.toLowerCase().includes(query) ||
          record.facility_name?.toLowerCase().includes(query)
      );
    }

    setFilteredRecords(filtered);
  }, [searchQuery, records, selectedFilter]);

  const getRecordTypeCounts = () => {
    const counts: Record<string, number> = {
      all: records.length,
      consultation: 0,
      diagnosis: 0,
      prescription: 0,
      lab_result: 0,
      imaging: 0,
      other: 0,
    };
    records.forEach((record) => {
      counts[record.record_type] = (counts[record.record_type] || 0) + 1;
    });
    return counts;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadDocument = async (userId: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("medical-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("medical-documents").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  };

  const handleEditRecord = (record: HealthRecord) => {
    setEditingRecord(record);
    setRecordType(record.record_type);
    setTitle(record.title);
    setDescription(record.description || "");
    setDate(record.date);
    setDoctorName(record.doctor_name || "");
    setFacilityName(record.facility_name || "");
    setIsDialogOpen(true);
  };

  const handleSaveRecord = async () => {
    if (!user) return;

    // Validate
    try {
      recordSchema.parse({
        title: title.trim(),
        description: description.trim() || undefined,
        doctor_name: doctorName.trim() || undefined,
        facility_name: facilityName.trim() || undefined,
      });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setUploading(true);

    try {
      let documentUrl = editingRecord?.document_url || null;

      // Upload new document if provided
      if (file) {
        documentUrl = await uploadDocument(user.id);
      }

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("health_records")
          .update({
            record_type: recordType,
            title: title.trim(),
            description: description?.trim() || null,
            date: date,
            doctor_name: doctorName?.trim() || null,
            facility_name: facilityName?.trim() || null,
            document_url: documentUrl,
          })
          .eq("id", editingRecord.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Health record updated successfully",
        });
      } else {
        // Insert new record
        const { error } = await supabase.from("health_records").insert({
          user_id: user.id,
          record_type: recordType,
          title: title.trim(),
          description: description?.trim() || null,
          date: date,
          doctor_name: doctorName?.trim() || null,
          facility_name: facilityName?.trim() || null,
          document_url: documentUrl,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Health record added successfully",
        });
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setDoctorName("");
      setFacilityName("");
      setFile(null);
      setEditingRecord(null);
      setIsDialogOpen(false);

      // Reload records
      await loadRecords(user.id);
    } catch (error) {
      console.error("Error saving record:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingRecord ? "update" : "add"} health record`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!user) return;

    setErrors({});
    setUploading(true);

    try {
      // Validate input
      const validationResult = recordSchema.safeParse({
        title: title.trim(),
        description: description?.trim(),
        doctor_name: doctorName?.trim(),
        facility_name: facilityName?.trim(),
      });

      if (!validationResult.success) {
        const newErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        setUploading(false);
        return;
      }

      // Upload document if present
      let documentUrl: string | null = null;
      if (file) {
        documentUrl = await uploadDocument(user.id);
      }

      // Insert record
      const { error } = await supabase.from("health_records").insert({
        user_id: user.id,
        record_type: recordType,
        title: title.trim(),
        description: description?.trim() || null,
        date,
        doctor_name: doctorName?.trim() || null,
        facility_name: facilityName?.trim() || null,
        document_url: documentUrl,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Health record added successfully",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setDoctorName("");
      setFacilityName("");
      setFile(null);
      setIsDialogOpen(false);

      // Reload records
      await loadRecords(user.id);
    } catch (error) {
      console.error("Error adding record:", error);
      toast({
        title: "Error",
        description: "Failed to add health record",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("health_records")
        .delete()
        .eq("id", recordId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Health record deleted successfully",
      });

      await loadRecords(user.id);
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Failed to delete health record",
        variant: "destructive",
      });
    }
  };

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      consultation: "from-blue-500 to-cyan-500",
      diagnosis: "from-red-500 to-orange-500",
      prescription: "from-green-500 to-emerald-500",
      lab_result: "from-purple-500 to-pink-500",
      imaging: "from-violet-500 to-purple-500",
      other: "from-gray-500 to-slate-500",
    };
    return colors[type] || colors.other;
  };

  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      consultation: "Consultation",
      diagnosis: "Diagnosis",
      prescription: "Prescription",
      lab_result: "Lab Result",
      imaging: "Imaging",
      other: "Other",
    };
    return labels[type] || "Other";
  };

  const getFileIcon = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <FileImage className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const handleDownloadDocument = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${title}.${url.split(".").pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (url: string, title: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    setViewingDocument({ url, title, type: ext || "" });
  };

  const handleShareRecord = async () => {
    if (!sharingRecord || !shareEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSharing(true);

    try {
      const { error } = await supabase.functions.invoke("share-health-record", {
        body: {
          recordId: sharingRecord.id,
          recipientEmail: shareEmail.trim(),
          recordTitle: sharingRecord.title,
          recordType: getRecordTypeLabel(sharingRecord.record_type),
          recordDate: new Date(sharingRecord.date).toLocaleDateString(),
          documentUrl: sharingRecord.document_url,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Health record shared with ${shareEmail}`,
      });

      setShareEmail("");
      setSharingRecord(null);
    } catch (error) {
      console.error("Error sharing record:", error);
      toast({
        title: "Error",
        description: "Failed to share health record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-100" />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Health Records</h1>
              <p className="text-xs text-muted-foreground">
                Your medical history & documents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="outline" className="bg-muted/50">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline Mode
              </Badge>
            )}
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search and Add Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingRecord(null);
                setTitle("");
                setDescription("");
                setDate(new Date().toISOString().split("T")[0]);
                setDoctorName("");
                setFacilityName("");
                setFile(null);
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-glow w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Health Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? "Edit Health Record" : "Add New Health Record"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground">
                    Record Information
                  </h3>
                  <div>
                    <Label htmlFor="recordType">Record Type *</Label>
                    <Select value={recordType} onValueChange={setRecordType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="lab_result">Lab Result</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Annual Checkup"
                      maxLength={200}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive mt-1">{errors.title}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add notes or details..."
                      rows={3}
                      maxLength={1000}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground">
                    Medical Details
                  </h3>
                  <div>
                    <Label htmlFor="doctorName">Doctor Name</Label>
                    <Input
                      id="doctorName"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. Name"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="facilityName">Hospital/Facility</Label>
                    <Input
                      id="facilityName"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="Hospital or clinic name"
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground">
                    Document Attachment
                  </h3>
                  <div>
                    <Label htmlFor="file">Upload Document (Max 20MB)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="file:text-sm file:font-medium"
                      />
                      {file && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFile(null)}
                          type="button"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {file && (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md mt-2">
                        {getFileIcon(file.name)}
                        <p className="text-xs text-foreground flex-1 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveRecord}
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
                  >
                    {uploading ? "Saving..." : editingRecord ? "Update Record" : "Save Record"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        {records.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {[
                { value: "all", label: "All Records", icon: FileText },
                { value: "consultation", label: "Consultation", icon: UserIcon },
                { value: "diagnosis", label: "Diagnosis", icon: FileText },
                { value: "prescription", label: "Prescription", icon: FileText },
                { value: "lab_result", label: "Lab Result", icon: FileText },
                { value: "imaging", label: "Imaging", icon: FileImage },
                { value: "other", label: "Other", icon: File },
              ].map((filter) => {
                const counts = getRecordTypeCounts();
                const count = counts[filter.value] || 0;
                const Icon = filter.icon;
                return (
                  <Button
                    key={filter.value}
                    variant={selectedFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter(filter.value)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                    <Badge
                      variant={selectedFilter === filter.value ? "secondary" : "outline"}
                      className="ml-1"
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Records Count */}
        {records.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {records.length} records
              {searchQuery && " matching your search"}
            </p>
          </div>
        )}

        {/* Records List */}
        {filteredRecords.length === 0 && records.length === 0 ? (
          <Card className="story-card p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Health Records Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start adding your medical records to keep track of your health journey
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Record
            </Button>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card className="story-card p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Records Found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search query
            </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="story-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRecordTypeColor(
                      record.record_type
                    )} flex items-center justify-center`}
                  >
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getRecordTypeLabel(record.record_type)}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold mb-2 line-clamp-1">
                  {record.title}
                </h3>
                {record.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {record.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {record.date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                  )}
                  {record.doctor_name && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserIcon className="w-3 h-3" />
                      {record.doctor_name}
                    </div>
                  )}
                  {record.facility_name && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building className="w-3 h-3" />
                      {record.facility_name}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {record.document_url && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          handleViewDocument(
                            record.document_url!,
                            record.title
                          )
                        }
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadDocument(
                            record.document_url!,
                            record.title
                          )
                        }
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRecord(record)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSharingRecord(record)}
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRecord(record.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Dialog */}
      <Dialog
        open={viewingDocument !== null}
        onOpenChange={() => setViewingDocument(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>{viewingDocument?.title}</span>
              {viewingDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownloadDocument(
                      viewingDocument.url,
                      viewingDocument.title
                    )
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              View and download your health record document
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
            {viewingDocument && (
              <>
                {["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
                  viewingDocument.type
                ) ? (
                  <img
                    src={viewingDocument.url}
                    alt={viewingDocument.title}
                    className="w-full h-auto rounded-lg"
                  />
                ) : viewingDocument.type === "pdf" ? (
                  <iframe
                    src={viewingDocument.url}
                    className="w-full h-[600px] rounded-lg border border-border"
                    title={viewingDocument.title}
                  />
                ) : ["doc", "docx"].includes(viewingDocument.type) ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                      viewingDocument.url
                    )}&embedded=true`}
                    className="w-full h-[600px] rounded-lg border border-border"
                    title={viewingDocument.title}
                  />
                ) : (
                  <div className="text-center py-12">
                    <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      File type: .{viewingDocument.type}
                    </p>
                    <Button
                      onClick={() =>
                        handleDownloadDocument(
                          viewingDocument.url,
                          viewingDocument.title
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Record Dialog */}
      <Dialog
        open={sharingRecord !== null}
        onOpenChange={() => {
          setSharingRecord(null);
          setShareEmail("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Health Record</DialogTitle>
            <DialogDescription>
              Share this health record with a doctor or family member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Share "{sharingRecord?.title}" with a doctor or family member via
                email.
              </p>
              <Label htmlFor="shareEmail">Recipient Email</Label>
              <Input
                id="shareEmail"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="doctor@example.com"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleShareRecord}
                disabled={sharing || !shareEmail.trim()}
                className="flex-1"
              >
                {sharing ? "Sharing..." : "Share Record"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSharingRecord(null);
                  setShareEmail("");
                }}
                disabled={sharing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HealthRecords;
