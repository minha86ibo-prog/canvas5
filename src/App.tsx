import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Palette, 
  Users, 
  Trophy, 
  Upload, 
  CheckCircle2, 
  MessageSquare, 
  Vote, 
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  User,
  LogOut,
  Timer,
  LogIn,
  X,
  ArrowLeft,
  QrCode,
  Copy
} from "lucide-react";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "./lib/utils";
import { getFeedback, generateAIImage } from "./lib/gemini";
import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  increment,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from "./lib/firebase";

// --- Constants ---
const PRESET_ARTWORKS = [
  {
    title: "별이 빛나는 밤",
    artist: "빈센트 반 고흐",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    description: "밤하늘의 소용돌이치는 구름과 빛나는 별, 그리고 사이프러스 나무가 특징인 후기 인상주의 걸작입니다."
  },
  {
    title: "진주 귀걸이를 한 소녀",
    artist: "요하네스 페르메이르",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Johannes_Vermeer_%281632-1675%29_-_The_Girl_With_The_Pearl_Earring_%281665%29.jpg/800px-Johannes_Vermeer_%281632-1675%29_-_The_Girl_With_The_Pearl_Earring_%281665%29.jpg",
    description: "신비로운 표정과 빛나는 진주 귀걸이, 그리고 이국적인 터번이 돋보이는 네덜란드 황금기 초상화입니다."
  },
  {
    title: "모나리자",
    artist: "레오나르도 다 빈치",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_by_Leonardo_da_Vinci_from_C2RMF_retouched.jpg/800px-Mona_Lisa_by_Leonardo_da_Vinci_from_C2RMF_retouched.jpg",
    description: "신비로운 미소와 스푸마토 기법으로 유명한 르네상스 시대의 가장 상징적인 초상화입니다."
  },
  {
    title: "일출, 인상",
    artist: "클로드 모네",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Claude_Monet%2C_Impression%2C_soleil_levant.jpg/1024px-Claude_Monet%2C_Impression%2C_soleil_levant.jpg",
    description: "인상주의라는 명칭의 기원이 된 작품으로, 항구의 아침 풍경을 짧은 붓터치와 빛의 효과로 포착했습니다."
  },
  {
    title: "아담의 창조",
    artist: "미켈란젤로",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1024px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg",
    description: "시스티나 성당 천장화의 일부로, 신이 아담에게 생명을 불어넣는 숭고한 순간을 표현했습니다."
  },
  {
    title: "우유 따르는 여인",
    artist: "요하네스 페르메이르",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg/800px-Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg",
    description: "일상적인 가사 노동의 순간을 정교한 빛의 묘사와 질감 표현으로 승화시킨 걸작입니다."
  }
];

// --- Types ---
type View = "home" | "teacher-dashboard" | "student-join" | "student-lobby" | "game-play" | "voting" | "results";

interface Student {
  id: string;
  nickname: string;
}

interface Submission {
  id: string;
  studentId: string;
  nickname: string;
  description: string;
  aiImage?: string;
  feedback?: string;
  voteCount: number;
}

interface Session {
  id: string;
  artwork: {
    url: string;
    title: string;
    artist: string;
    description: string;
  };
  rounds: number;
  currentRound: number;
  status: "waiting" | "playing" | "voting" | "finished";
  teacherId: string;
}

// --- Components ---

const Button = ({ children, onClick, className, variant = "primary", disabled = false, icon: Icon, loading = false }: any) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
    secondary: "bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50",
    outline: "bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    accent: "bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={20} />}
          {children}
        </>
      )}
    </button>
  );
};

const Card = ({ children, className, onClick }: any) => (
  <div 
    onClick={onClick}
    className={cn("bg-white rounded-2xl shadow-xl border border-indigo-50 p-6", className)}
  >
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiImage, setAiImage] = useState("");

  // Student Input State
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [studentDescription, setStudentDescription] = useState("");
  const [feedback, setFeedback] = useState("");

  // Teacher Form State
  const [artworkTitle, setArtworkTitle] = useState("");
  const [artworkArtist, setArtworkArtist] = useState("");
  const [artworkDesc, setArtworkDesc] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [rounds, setRounds] = useState(3);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && view === "home") {
        setView("teacher-dashboard");
      }
    });
    return () => unsubscribe();
  }, [view]);

  // Real-time session listener
  useEffect(() => {
    if (!joinCode && !session?.id) return;
    const sessionId = session?.id || joinCode.toUpperCase();
    
    const unsubSession = onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Session;
        setSession({ ...data, id: docSnap.id });
        
        // Auto-navigate based on status
        if (data.status === "playing") setView("game-play");
        if (data.status === "voting") setView("voting");
        if (data.status === "finished") setView("results");
      }
    });

    const unsubStudents = onSnapshot(collection(db, "sessions", sessionId, "students"), (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    const unsubSubmissions = onSnapshot(collection(db, "sessions", sessionId, "submissions"), (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
    });

    return () => {
      unsubSession();
      unsubStudents();
      unsubSubmissions();
    };
  }, [session?.id, joinCode]);

  const handleTeacherLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setView("teacher-dashboard");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `artworks/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setArtworkUrl(url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_ARTWORKS[0]) => {
    setArtworkTitle(preset.title);
    setArtworkArtist(preset.artist);
    setArtworkUrl(preset.url);
    setArtworkDesc(preset.description);
  };

  const handleCreateSession = async () => {
    if (!artworkUrl || !artworkTitle || !user) {
      alert("작품 정보와 이미지를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const sessionData: Session = {
      id: sessionId,
      teacherId: user.uid,
      status: "waiting",
      artwork: { url: artworkUrl, title: artworkTitle, artist: artworkArtist, description: artworkDesc },
      rounds,
      currentRound: 1
    };

    try {
      await setDoc(doc(db, "sessions", sessionId), {
        ...sessionData,
        createdAt: serverTimestamp()
      });
      setSession(sessionData);
    } catch (error) {
      console.error("Session creation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinCode || !nickname) return;
    setLoading(true);
    const sessionId = joinCode.toUpperCase();
    try {
      const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
      if (sessionDoc.exists()) {
        const studentId = Math.random().toString(36).substring(2, 10);
        await setDoc(doc(db, "sessions", sessionId, "students", studentId), {
          nickname,
          joinedAt: serverTimestamp()
        });
        setSession({ id: sessionId, ...sessionDoc.data() } as Session);
        setView("student-lobby");
      } else {
        alert("세션을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Join failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (session) {
      await updateDoc(doc(db, "sessions", session.id), { status: "playing" });
    }
  };

  const handleSubmitDescription = async () => {
    if (!studentDescription || !session) return;
    setLoading(true);
    
    try {
      const aiFeedback = await getFeedback(session.artwork.description, studentDescription);
      setFeedback(aiFeedback || "");
      
      await addDoc(collection(db, "sessions", session.id, "submissions"), {
        studentId: auth.currentUser?.uid || "anonymous",
        nickname: nickname || "익명",
        description: studentDescription,
        voteCount: 0,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoting = async () => {
    if (session) {
      await updateDoc(doc(db, "sessions", session.id), { status: "voting" });
    }
  };

  const handleCastVote = async (submissionId: string) => {
    if (session) {
      await updateDoc(doc(db, "sessions", session.id, "submissions", submissionId), {
        voteCount: increment(1)
      });
      setView("results");
    }
  };

  const handleGenerateImage = async (desc: string) => {
    setLoading(true);
    try {
      const img = await generateAIImage(desc);
      setAiImage(img);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("AI Image Generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Views ---

  const HomeView = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold tracking-wider uppercase">
            <Sparkles size={16} />
            AI-Powered Art Education
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-indigo-950 tracking-tight">
            ACE <span className="text-indigo-600">CANVAS</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            미술 작품을 깊이 감상하고 구체적으로 표현하는 즐거움. 
            AI와 함께하는 실시간 감상 게임에 참여해 보세요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card className="hover:scale-105 transition-transform cursor-pointer group" onClick={handleTeacherLogin}>
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
              <Palette size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-left">교사로 시작하기</h3>
            <p className="text-gray-500 mb-6 text-left">Google 로그인으로 세션을 생성하고 학생들과 함께하세요.</p>
            <Button variant="ghost" className="w-full" icon={LogIn}>Google 로그인</Button>
          </Card>

          <Card className="hover:scale-105 transition-transform cursor-pointer group" onClick={() => setView("student-join")}>
            <div className="h-16 w-16 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
              <Users size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-left">학생으로 참여하기</h3>
            <p className="text-gray-500 mb-6 text-left">코드를 입력하고 친구들과 함께 작품을 묘사해 보세요.</p>
            <Button variant="ghost" className="w-full" icon={ChevronRight}>참여하기</Button>
          </Card>
        </div>
      </motion.div>
    </div>
  );

  const TeacherDashboardView = () => (
    <div className="min-h-screen bg-gray-50 p-8 text-left">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("home")} className="p-2">뒤로가기</Button>
            {user?.photoURL && <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-indigo-200" />}
            <div>
              <h1 className="text-xl font-bold text-indigo-950">{user?.displayName} 선생님</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => auth.signOut().then(() => setView("home"))}>로그아웃</Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="text-indigo-600" /> 작품 선택 및 업로드</h3>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <Button 
                  variant="secondary" 
                  icon={Upload} 
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  이미지 불러오기
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">추천 작품 선택</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PRESET_ARTWORKS.map((preset, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "relative aspect-video rounded-xl overflow-hidden cursor-pointer border-4 transition-all",
                        artworkUrl === preset.url ? "border-indigo-600 scale-95" : "border-transparent hover:border-indigo-200"
                      )}
                    >
                      <img src={preset.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <p className="text-[10px] text-white font-bold truncate">{preset.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 ml-1">작품 제목</label>
                  <input
                    value={artworkTitle}
                    onChange={(e) => setArtworkTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="예: 별이 빛나는 밤"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 ml-1">작가 이름</label>
                  <input
                    value={artworkArtist}
                    onChange={(e) => setArtworkArtist(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="예: 빈센트 반 고흐"
                  />
                </div>
              </div>
              
              {artworkUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-indigo-100 bg-white">
                  <img src={artworkUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setArtworkUrl("")}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 ml-1 block">작품 설명 (AI 분석용)</label>
                <textarea 
                  value={artworkDesc}
                  onChange={(e) => setArtworkDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 bg-white text-gray-900"
                  placeholder="작품의 특징, 색감, 구도 등을 자세히 적어주세요."
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Timer className="text-indigo-600" /> 라운드 설정</h3>
              <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl">
                <span className="font-bold text-indigo-900">{rounds} 라운드</span>
                <div className="flex gap-2">
                  <button onClick={() => setRounds(Math.max(1, rounds - 1))} className="w-8 h-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center">-</button>
                  <button onClick={() => setRounds(rounds + 1)} className="w-8 h-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center">+</button>
                </div>
              </div>
              <Button className="w-full py-4 text-lg" onClick={handleCreateSession} loading={loading}>게임 세션 생성</Button>
            </Card>

            {session && (
              <Card className="bg-indigo-900 text-white space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest">접속 코드</p>
                  <h2 className="text-5xl font-black tracking-tighter">{session.id}</h2>
                </div>
                <div className="flex justify-center p-4 bg-white rounded-2xl">
                  <QRCodeSVG value={`${window.location.origin}?code=${session.id}`} size={150} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>참여 학생</span>
                    <span className="font-bold">{students.length}명</span>
                  </div>
                  <Button variant="accent" className="w-full text-amber-950" onClick={handleStartGame}>게임 시작</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const StudentJoinView = () => (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full space-y-8 p-10 relative">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("home")} className="absolute top-4 left-4 p-2">뒤로가기</Button>
        <div className="text-center space-y-2 pt-8">
          <h2 className="text-3xl font-bold text-gray-900">게임 참여하기</h2>
          <p className="text-gray-500">닉네임과 접속 코드를 입력하세요.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 ml-1">닉네임</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="멋진 예술가"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 ml-1">접속 코드</label>
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ABCDEF"
              />
            </div>
          </div>
          <Button variant="accent" className="w-full mt-4 text-amber-950" onClick={handleJoinSession} loading={loading}>입장하기</Button>
        </div>
      </Card>
    </div>
  );

  const StudentLobbyView = () => (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center relative">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("student-join")} className="absolute top-6 left-6 text-white hover:bg-white/10 p-2">뒤로가기</Button>
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mb-8"
      >
        <Users size={80} />
      </motion.div>
      <h2 className="text-4xl font-black mb-4">대기실 입장 완료!</h2>
      <p className="text-xl text-indigo-100 mb-8">선생님이 게임을 시작할 때까지 잠시만 기다려 주세요.</p>
      <div className="bg-indigo-500/30 px-6 py-3 rounded-full font-bold">
        참여 코드: {session?.id}
      </div>
    </div>
  );

  const GamePlayView = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b p-4 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-sm">ROUND {session?.currentRound}</div>
          <h2 className="font-bold text-gray-900">{session?.artwork.title} - {session?.artwork.artist}</h2>
        </div>
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <Timer size={18} /> 02:00
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-8 p-8 overflow-hidden">
        <div className="h-full flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative group">
            <img 
              src={session?.artwork.url} 
              alt="Artwork" 
              className="w-full h-full object-contain p-4"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex-1 flex flex-col gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-left"><MessageSquare className="text-indigo-600" /> 작품 묘사하기</h3>
            <p className="text-gray-500 text-sm text-left">작품의 색감, 형태, 분위기를 자유롭게, 구체적으로 설명해 보세요.</p>
            <textarea 
              value={studentDescription}
              onChange={(e) => setStudentDescription(e.target.value)}
              className="flex-1 w-full p-4 rounded-2xl border-2 border-indigo-50 focus:border-indigo-500 focus:outline-none text-lg resize-none min-h-[250px] bg-white text-gray-900 shadow-inner"
              placeholder="여기에 묘사 내용을 자유롭게 입력하세요... 글자 수 제한 없이 마음껏 표현해 보세요!"
              spellCheck="false"
            />
            <Button className="w-full py-4" onClick={handleSubmitDescription} loading={loading}>제출하기</Button>
          </Card>

          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80} /></div>
                <h4 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={18} className="text-amber-400" /> AI 피드백</h4>
                <p className="text-indigo-100 leading-relaxed text-left">{feedback}</p>
                {user?.uid === session?.teacherId && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="accent" className="text-xs py-2 px-4" onClick={handleStartVoting}>투표 단계로 이동</Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

  const VotingView = () => (
    <div className="min-h-screen bg-indigo-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold">
            <Vote size={18} /> 투표 시간!
          </div>
          <h2 className="text-4xl font-black text-indigo-950">가장 잘 묘사한 글을 선택하세요</h2>
          <p className="text-gray-600">작품의 느낌을 가장 잘 살린 설명을 골라주세요.</p>
        </div>

        <div className="grid gap-4">
          {submissions.map((sub) => (
            <motion.div 
              key={sub.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleCastVote(sub.id)}
              className="bg-white p-6 rounded-2xl shadow-md border border-indigo-100 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex-1 text-left">
                <p className="text-lg text-gray-800 leading-relaxed">"{sub.description}"</p>
                <span className="text-sm text-indigo-500 font-bold mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">- {sub.nickname}</span>
              </div>
              <div className="ml-6 text-indigo-200 group-hover:text-indigo-600 transition-colors">
                <CheckCircle2 size={32} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const ResultsView = () => {
    const winner = [...submissions].sort((a, b) => b.voteCount - a.voteCount)[0];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-block p-4 bg-amber-400 rounded-full text-amber-950 mb-4"
            >
              <Trophy size={48} />
            </motion.div>
            <h2 className="text-5xl font-black">이번 라운드 우승작!</h2>
            <p className="text-indigo-300 text-xl">"{winner?.description}"</p>
            <p className="text-amber-400 font-bold text-2xl">- {winner?.nickname} 학생 -</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/10 border-white/10 backdrop-blur-md p-4">
              <p className="text-center text-sm font-bold text-indigo-300 mb-4 uppercase tracking-widest">원본 작품</p>
              <img src={session?.artwork.url} className="w-full h-80 object-contain rounded-xl" referrerPolicy="no-referrer" />
            </Card>

            <Card className="bg-white/10 border-white/10 backdrop-blur-md p-4 flex flex-col items-center justify-center min-h-[400px]">
              <p className="text-center text-sm font-bold text-indigo-300 mb-4 uppercase tracking-widest">AI 생성 이미지</p>
              {aiImage ? (
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={aiImage} 
                  className="w-full h-80 object-cover rounded-xl shadow-2xl" 
                />
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <Button variant="accent" onClick={() => handleGenerateImage(winner?.description || "")} loading={loading}>
                    AI 이미지 생성하기
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => setView("home")}>메인으로</Button>
            {user?.uid === session?.teacherId && (
              <Button variant="accent" className="text-amber-950">다음 라운드 시작</Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans text-gray-900 antialiased">
      <AnimatePresence mode="wait">
        {view === "home" && <HomeView key="home" />}
        {view === "teacher-dashboard" && <TeacherDashboardView key="dashboard" />}
        {view === "student-join" && <StudentJoinView key="join" />}
        {view === "student-lobby" && <StudentLobbyView key="lobby" />}
        {view === "game-play" && <GamePlayView key="play" />}
        {view === "voting" && <VotingView key="voting" />}
        {view === "results" && <ResultsView key="results" />}
      </AnimatePresence>
    </div>
  );
}
