const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /import \{\s*Bot, Send, Sparkles, BookOpen, Target, FileQuestion, ClipboardCheck,\s*Loader2, X, Download, Menu, Plus, MessageSquare, Edit2, Reply, Trash2,\s*ThumbsUp, ThumbsDown, Copy, Check, RefreshCw, User, UserCheck, Settings,\s*Upload, FileUp, CheckSquare, ListChecks, Printer, FileText, SlidersHorizontal,\s*Image as ImageIcon, Link as LinkIcon, Building2, CheckCircle2, Info\s*\} from "lucide-react";/;

const replacement = `import { 
  Bot, Send, Sparkles, BookOpen, Target, FileQuestion, ClipboardCheck, 
  Loader2, X, Download, Menu, Plus, MessageSquare, Edit2, Reply, Trash2, 
  ThumbsUp, ThumbsDown, Copy, Check, RefreshCw, User, UserCheck, Settings,
  Upload, FileUp, CheckSquare, ListChecks, Printer, FileText, SlidersHorizontal,
  Image as ImageIcon, Link as LinkIcon, Building2, CheckCircle2, Info, CalendarDays
} from "lucide-react";`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
