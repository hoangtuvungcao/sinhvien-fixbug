import { EnemyArchetype, PowerUpType, SkillId, UpgradeSkillDefinition } from '../types/game';

export const GAME_ASSETS = {
  titleKeyArt: '/src/assets/images/title_key_art_1794899508470.jpg',
  bossDeadlineEmblem: '/src/assets/images/boss_deadline_emblem_1794899509282.jpg',
  tributeSunflowerCrest: '/src/assets/images/tribute_sunflower_crest_1794899508859.jpg',
};

export const UPGRADE_SKILLS: Record<SkillId, UpgradeSkillDefinition> = {
  forLoop: {
    id: 'forLoop',
    name: 'Vòng Lặp For Đa Luồng',
    teacherTag: 'Môn Lập trình Căn bản',
    maxLevel: 5,
    accentColor: '#06b6d4',
    descriptions: [
      'Bắn 2 tia code song song giúp dọn đàn Lỗi Chấm Phẩy nhanh hơn.',
      'Tăng lên 3 tia đạn quạt rộng kèm +15% sát thương.',
      'Tăng lên 4 tia đạn kèm tốc độ bay nhanh hơn 20%.',
      'Tăng lên 5 tia đạn quạt rộng và tăng 25% sát thương.',
      'Đỉnh cao Đa Luồng: 6 tia đạn liên hoàn quét sạch mặt trận.',
    ],
  },
  tryCatch: {
    id: 'tryCatch',
    name: 'Khiên Try-Catch Hộ Thể',
    teacherTag: 'Môn Kỹ thuật Lập trình',
    maxLevel: 5,
    accentColor: '#38bdf8',
    descriptions: [
      'Triệu hồi 2 khiên lục giác 3D quay quanh người, chặn đạn Bug và húc văng quái.',
      'Tăng lên 3 khiên năng lượng với tốc độ xoay nhanh hơn.',
      'Mở rộng vòng khiên và tăng 35% sát thương va chạm.',
      'Tăng lên 4 khiên Cyan bảo vệ toàn diện 360 độ.',
      'Phòng tuyến Bất Tử: 5 khiên xoay tốc độ cao nghiền nát Bug.',
    ],
  },
  banMeCoffee: {
    id: 'banMeCoffee',
    name: 'Cà Phê Ban Mê Overclock',
    teacherTag: 'Nhiên liệu Đêm Trắng Tây Nguyên',
    maxLevel: 5,
    accentColor: '#f59e0b',
    descriptions: [
      'Tăng 18% tốc độ bắn và +10% tốc độ chạy né đạn.',
      'Giảm 20% hồi chiêu Lướt (Space) và tăng 20% tốc độ bắn.',
      'Tăng 25% tốc độ chạy và nạp Năng lượng Tri Ân nhanh hơn 25%.',
      'Overclock cực đại: tốc độ bắn +35%, Dash hồi siêu nhanh.',
      'Tinh túy Ban Mê: Xả phím liên thanh không kịp thở giữa mưa Bug.',
    ],
  },
  binarySearch: {
    id: 'binarySearch',
    name: 'Tia Nhị Phân Xuyên Thấu',
    teacherTag: 'Môn Cấu trúc Dữ liệu & Giải thuật',
    maxLevel: 5,
    accentColor: '#a855f7',
    descriptions: [
      'Đạn code xuyên qua tối đa 2 Bug đứng thẳng hàng.',
      'Tăng độ xuyên thấu lên 3 mục tiêu và +20% sát thương.',
      'Tăng kích thước tia đạn và xuyên qua 4 mục tiêu.',
      'Đạn xuyên thấu gây thêm 30% sát thương chí mạng.',
      'Tối ưu O(log n): Xuyên qua 6 Bug và gây sát thương cực đại.',
    ],
  },
  mentorAdvice: {
    id: 'mentorAdvice',
    name: 'Lời Khuyên Thầy Chủ Nhiệm',
    teacherTag: 'Cố vấn Học tập Khoa CNTT',
    maxLevel: 5,
    accentColor: '#10b981',
    descriptions: [
      'Hồi ngay 35 HP, tăng +25 HP tối đa và +15% tỷ lệ chí mạng.',
      'Hồi 40 HP, tăng +30 HP tối đa và +20% sát thương cơ bản.',
      'Hồi 50 HP, tăng +35 HP tối đa và sát thương chí mạng x2.2.',
      'Hồi 60 HP, tăng +40 HP tối đa và giảm 15% sát thương nhận vào.',
      'Điểm tựa Vững chắc: Hồi đầy HP và tăng mạnh sức mạnh toàn diện.',
    ],
  },
  sunflowerAura: {
    id: 'sunflowerAura',
    name: 'Hào Quang Hoa Dã Quỳ',
    teacherTag: 'Ký ức Tháng 11 ĐHTN',
    maxLevel: 5,
    accentColor: '#facc15',
    descriptions: [
      'Tỏa vòng sáng vàng 3D đốt cháy Bug ở gần và tăng 45% tầm hút XP.',
      'Mở rộng bán kính hào quang và tăng 40% sát thương thiêu đốt.',
      'Tăng gấp đôi tầm hút Hạt Tri Thức và làm chậm Bug bên trong.',
      'Phát xung sóng vàng định kỳ đẩy lùi đàn Bug áp sát.',
      'Rực rỡ Cao nguyên: Vùng sáng khổng lồ thiêu rụi mọi lỗi lầm.',
    ],
  },
};

export interface EnemyCodexEntry {
  type: EnemyArchetype;
  name: string;
  role: string;
  color: string;
  lore: string;
}

export const ENEMY_CODEX: EnemyCodexEntry[] = [
  {
    type: 'syntax',
    name: 'Lỗi Thiếu Dấu ;',
    role: 'Quái bầy đàn',
    color: '#f43f5e',
    lore: 'Nhỏ nhưng đông như quân Nguyên. Chỉ cần quên một dấu chấm phẩy lúc 2h sáng là đỏ nguyên màn hình.',
  },
  {
    type: 'nullPtr',
    name: 'NullPointer Tàng Hình',
    role: 'Sát thủ lao nhanh',
    color: '#fb7185',
    lore: 'Thoắt ẩn thoắt hiện, chiếu tia laser đỏ khóa mục tiêu rồi lao thẳng vào lúc bạn chủ quan nhất.',
  },
  {
    type: 'loop',
    name: 'Vòng Lặp while(true)',
    role: 'Phân thân nhân đôi',
    color: '#c084fc',
    lore: 'Xoay vòng không lối thoát. Khi bị tiêu diệt sẽ đẻ thêm 2 Lỗi Thiếu Chấm Phẩy mới!',
  },
  {
    type: 'memLeak',
    name: 'Chrome Ngốn 16GB RAM',
    role: 'Tanker & Vùng làm chậm',
    color: '#8b5cf6',
    lore: 'Mở 40 tab StackOverflow chưa chịu đóng. Khi nổ tung sẽ để lại vũng tràn RAM làm chậm bước chạy.',
  },
  {
    type: 'conflict',
    name: 'Git Merge Conflict',
    role: 'Xạ thủ tầm xa',
    color: '#f97316',
    lore: 'Luôn giữ khoảng cách và bắn đạn lỗi code mỗi khi hai thành viên trong nhóm sửa chung một file.',
  },
  {
    type: 'miniBoss404',
    name: 'Mini-Boss 404 Mất Slide',
    role: 'Boss Đợt 3',
    color: '#f43f5e',
    lore: 'Ác mộng trước giờ báo cáo giữa kỳ: bắn mưa đạn tỏa tròn và triệu hồi đàn Bug con.',
  },
  {
    type: 'bossDeadline',
    name: 'Deadline 23:59 Tối Hậu',
    role: 'Trùm Cuối Đợt 5 (3 Pha)',
    color: '#e11d48',
    lore: 'Chiếc đồng hồ tử thần tiến hóa 3 pha với mưa thiên thạch báo cáo và tia laser đỏ quét toàn sàn.',
  },
];

export const POWERUP_CODEX: Array<{ type: PowerUpType; name: string; color: string; effect: string }> = [
  {
    type: 'coffeeBoost',
    name: 'Ly Cà Phê Ban Mê Overclock',
    color: '#f59e0b',
    effect: 'Tăng 42% tốc độ chạy và gần gấp đôi tốc độ bắn trong 8 giây.',
  },
  {
    type: 'teacherUsb',
    name: 'USB Cứu Hộ Của Thầy',
    color: '#10b981',
    effect: 'Hồi ngay +35 HP và xóa sạch toàn bộ đạn Bug trên sân.',
  },
  {
    type: 'ctrlZ',
    name: 'Phím Tắt Ctrl+Z Thần Thánh',
    color: '#06b6d4',
    effect: 'Đóng băng thời gian, khóa cứng toàn bộ Bug thường trong 4 giây.',
  },
];

export const TEACHER_ULTIMATE_QUOTES: string[] = [
  '"Code chạy trên máy em thôi hả? Đừng lo, thầy mang máy thầy ra chạy phụ!"',
  '"Thuật toán khó đến mấy, bóc tách từng dòng rồi cũng qua môn thôi em!"',
  '"Cạn ly cà phê Ban Mê này rồi code tiếp, sắp bảo vệ đồ án rồi!"',
  '"Đừng sửa bậy lúc 23:55, bình tĩnh thầy chỉ chỗ đặt Try-Catch cho!"',
  '"Mỗi bug đỏ hôm nay là kinh nghiệm vàng để mai đi thực tập không bị la."',
  '"Mùa hoa Dã Quỳ lại nở, chúc các kỹ sư tương lai ĐHTN luôn vững tay phím!"',
];

export const FUNNY_COMBAT_BARKS: string[] = [
  'Code chạy rồi, cấm sờ!',
  'Quên git push!!',
  'Copy StackOverflow!',
  'Ctrl+S liên tục!',
  'Máy em chạy mượt mà?',
  'Đừng xóa dòng này!',
  'Lại thiếu dấu ;',
  'Wifi Lab yếu quá!',
  'Cứu em Thầy ơi!',
  'Nộp bài kịp lúc!',
];

export const PRESET_TRIBUTE_MESSAGES: string[] = [
  'Nhân ngày 20/11, em xin gửi lời tri ân sâu sắc nhất đến Thầy/Cô Khoa CNTT ĐHTN đã kiên nhẫn dìu dắt chúng em qua từng dòng code, từng mùa bug xuyên đêm.',
  'Cảm ơn Thầy/Cô vì những giờ thực hành tận tâm, những lời góp ý thẳng thắn và tinh thần tiếp lửa giúp sinh viên tụi em vượt qua mọi deadline.',
  'Chúc Thầy/Cô luôn thật nhiều sức khỏe, giữ mãi nụ cười và ngọn lửa nhiệt huyết để dìu dắt thêm nhiều thế hệ kỹ sư CNTT Đại học Tây Nguyên.',
];

export const TRIBUTE_BEACON_MEMORIES: string[] = [
  'Ký ức Phòng Lab 20/11 · "Đừng sợ màn hình đỏ lỗi, cứ bình tĩnh đọc log từ dòng đầu!"',
  'Ký ức Đêm Trắng ĐHTN · "Thầy mang theo bình trà nóng qua phòng thực hành tiếp lửa cả nhóm!"',
  'Ký ức Bảo Vệ Giữa Kỳ · "Cô sửa từng slide thuyết trình lúc 22h để tụi em tự tin lên bục!"',
  'Ký ức Mùa Hoa Dã Quỳ · "Một dòng code sạch là món quà tri ân đẹp nhất gửi Thầy Cô CNTT!"',
];

export interface RubricCriterionItem {
  id: string;
  title: string;
  maxPoints: number;
  highlight: string;
  evidence: string;
}

export const CONTEST_RUBRIC_CRITERIA: RubricCriterionItem[] = [
  {
    id: 'creativity',
    title: '1. Tính sáng tạo, độc đáo',
    maxPoints: 30,
    highlight: 'Biến hành trình code đồ án 20/11 thành game hành động 3D Three.js',
    evidence:
      'Kết hợp thẩm mỹ Cyberpunk Neon Anime chống chói với Hoa Dã Quỳ ĐHTN; hóa thân lỗi lập trình (Zombie Thiếu ;, Hồn ma NullPtr, Alien while(true), Mecha Chrome 16GB RAM, Raider Merge Conflict, Hiệp sĩ 404 & Quỷ vương Deadline 23:59) bằng nhân vật Kenney 3D cel-shaded có viền nét anime; 4 bàn Holo-Table Ký Ức Tri Ân tương tác trên sân rộng 140×140.',
  },
  {
    id: 'tribute',
    title: '2. Nội dung, thông điệp tri ân',
    maxPoints: 25,
    highlight: 'Câu chuyện 5 chương xuyên đêm cùng Thầy Cô & Xuất thiệp 20/11 (.PNG)',
    evidence:
      'Mỗi đợt quái tái hiện một cột mốc đồ án (21:00 đến 23:59), kỹ năng nâng cấp là "Bí Kíp Thầy Cô Truyền Thụ", Chiêu cuối E phát trích dẫn tri ân, và màn hình kết thúc cho phép cá nhân hóa & tải Thiệp Tri Ân .PNG gửi tặng giảng viên Khoa CNTT ĐHTN.',
  },
  {
    id: 'tech',
    title: '3. Ứng dụng, làm chủ công nghệ',
    maxPoints: 20,
    highlight: 'Minh bạch phần nhóm tự thiết kế & phần AI hỗ trợ, chạy tĩnh 100% trên Vercel',
    evidence:
      'Render WebGL Three.js + Cel-Shading Anime (MeshToonMaterial + viền nét SkinnedMesh) + UnrealBloomPass chống chói, SkeletonUtils + AnimationMixer cho toàn bộ nhân vật & Boss, Web Audio API Synthesizer đa lớp không cần MP3, Radar & Canvas 2D xuất thiệp.',
  },
  {
    id: 'polish',
    title: '4. Chất lượng và mức hoàn thiện',
    maxPoints: 15,
    highlight: '3 mức độ khó, radar chiến thuật, combat đa kỹ năng, tối ưu PC & Mobile',
    evidence:
      'Hỗ trợ cả Tự khóa lẫn Ngắm chuột + Click giữ Overdrive & Giải nhiệt Hoàn hảo (R), 3 kỹ năng chủ động (Space Lướt, Q Xung Phản Đạn 360°, E Bão Hoa Dã Quỳ), xếp hạng Style D–SS, góc nhìn cao linh hoạt và tự giảm tải trên máy yếu.',
  },
  {
    id: 'pitch',
    title: '5. Trình diễn 4 phút & Hỏi đáp 2 phút',
    maxPoints: 10,
    highlight: 'Tích hợp chế độ Demo Sân Khấu & Hồ sơ thuyết trình ngay trong game',
    evidence:
      'Nhịp trận gọn ~3 phút vừa vặn demo 4 phút trên sân khấu Gala 19/11/2026; có thêm chế độ "Demo Boss 23:59" vào thẳng pha cao trào và bảng giải đáp nhanh cho phần phản biện 2 phút.',
  },
];

export const TECH_OWNERSHIP_ROWS: Array<{
  module: string;
  teamWork: string;
  aiAssist: string;
}> = [
  {
    module: 'Ý tưởng 20/11 & Kịch bản ĐHTN',
    teamWork:
      'Xây dựng cốt truyện sinh viên CNTT Tây Nguyên vượt Deadline 23:59, lời thoại vui, 6 Bí Kíp môn học và thông điệp thiệp tri ân.',
    aiAssist: 'Gợi ý biên tập văn phong súc tích, chuẩn hóa thông số cân bằng độ khó.',
  },
  {
    module: 'Đồ họa 3D Anime & Tài nguyên Kenney',
    teamWork:
      'Tuyển chọn & tổ chức hơn 40 mô hình GLB Kenney CC0 (Mini-Characters, Graveyard, Space Station, Nature), phối phụ kiện anime & bố cục sân 140×140 chống chói.',
    aiAssist: 'Viết loader GLTFLoader, shader viền nét SkinnedMesh cel-shading và hiệu chỉnh Bloom Three.js.',
  },
  {
    module: 'Cơ chế Combat & Cân bằng',
    teamWork:
      'Thiết kế nhịp chiến đấu PC/Mobile, kỹ năng Q/Space/E/R, xếp hạng Style, quái Tinh Anh và kiểm thử độ khó thực tế.',
    aiAssist: 'Hỗ trợ toán va chạm hình tròn, hitstop, particle pooling và tối ưu vòng lặp FPS.',
  },
  {
    module: 'Âm thanh Web Audio & Thiệp PNG',
    teamWork:
      'Chỉnh cao độ nhạc nền 3 trạng thái, chọn mẫu thiệp 20/11 và kiểm tra xuất ảnh thực tế trên Chrome/Safari/Mobile.',
    aiAssist: 'Sinh code Web Audio Synthesizer (Compressor + Oscillator) và Canvas 2D export.',
  },
];

export const STAGE_DEMO_TIMELINE: Array<{
  time: string;
  phase: string;
  action: string;
}> = [
  {
    time: '0:00 – 0:45',
    phase: 'Mở đầu & Đặt vấn đề',
    action:
      'Giới thiệu bối cảnh Đêm trước Deadline 20/11 tại Khoa CNTT ĐHTN. Xoay góc nhìn 3D màn hình chính cho BGK thấy nhân vật & bối cảnh Cao nguyên Cyber-Lab.',
  },
  {
    time: '0:45 – 2:15',
    phase: 'Demo Combat trực tiếp',
    action:
      'Nhấn "Bắt Đầu Chiến Đấu" (hoặc "Demo Boss 23:59" để vào thẳng cao trào), biểu diễn Lướt Space, Xung Phím Cơ Q, kích hoạt Holo-Table Ký Ức và tung Chiêu cuối E Bão Hoa Dã Quỳ.',
  },
  {
    time: '2:15 – 3:15',
    phase: 'Cao trào & Thiệp Tri Ân .PNG',
    action:
      'Hạ Boss Deadline 23:59, nhập tên Thầy/Cô + lời chúc ngay trên sân khấu và bấm "Tải ảnh Thiệp (.PNG)" minh chứng giá trị tri ân thực tế.',
  },
  {
    time: '3:15 – 4:00',
    phase: 'Kiến trúc & Chốt thông điệp',
    action:
      'Mở nhanh tab "Làm Chủ Công Nghệ" trình bày phần tự làm vs AI hỗ trợ, nhấn mạnh app chạy tĩnh 100% không tốn server, sẵn sàng để khán giả quét link chơi ngay.',
  },
];

export const JURY_QA_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'Nhóm tự làm phần nào và AI hỗ trợ phần nào?',
    a: 'Nhóm trực tiếp lên ý tưởng game 20/11 bản sắc ĐHTN, thiết kế 5 đợt quái/Boss, tuyển chọn & ghép 20 asset 3D Kenney, viết kịch bản tri ân, cân bằng gameplay và kiểm thử đa thiết bị. AI đóng vai trò trợ lý lập trình tăng tốc code Three.js, Web Audio Synthesizer và tối ưu TypeScript.',
  },
  {
    q: 'Vì sao chọn làm web game 3D thuần client thay vì gắn AI runtime?',
    a: 'Để triển khai tĩnh 100% lên Vercel ổn định trong hội trường Gala đông người dùng cùng lúc, không lo hết quota API hay độ trễ mạng, bật link là thầy cô và sinh viên chơi mượt ngay trên điện thoại.',
  },
  {
    q: 'Thông điệp tri ân 20/11 thể hiện ở đâu ngoài màn hình kết thúc?',
    a: 'Xuyên suốt từ đầu đến cuối trận: hệ thống 6 kỹ năng là các môn học của thầy cô, 4 bàn Holo-Table giữa sân phát Ký Ức Giảng Đường khi chạm vào, Chiêu cuối E trích dẫn lời động viên của giảng viên, và phần kết xuất thiệp .PNG gửi tặng tận tay thầy cô.',
  },
];

export interface WaveConfig {
  wave: number;
  label: string;
  durationSeconds: number;
  spawnInterval: number;
  allowedTypes: Array<'syntax' | 'nullPtr' | 'loop' | 'memLeak' | 'conflict'>;
  bossType?: 'miniBoss404' | 'bossDeadline';
}

export const WAVE_CONFIGS: WaveConfig[] = [
  {
    wave: 1,
    label: 'Đợt 1 · 21:00 Quên Chấm Phẩy Phòng Lab',
    durationSeconds: 20,
    spawnInterval: 0.62,
    allowedTypes: ['syntax', 'nullPtr'],
  },
  {
    wave: 2,
    label: 'Đợt 2 · 22:30 Chrome Ngốn 16GB RAM',
    durationSeconds: 24,
    spawnInterval: 0.56,
    allowedTypes: ['syntax', 'nullPtr', 'loop', 'memLeak'],
  },
  {
    wave: 3,
    label: 'Đợt 3 · 23:15 Mini-Boss 404 Mất Slide',
    durationSeconds: 34,
    spawnInterval: 0.72,
    allowedTypes: ['syntax', 'nullPtr', 'loop', 'conflict'],
    bossType: 'miniBoss404',
  },
  {
    wave: 4,
    label: 'Đợt 4 · 23:40 Đêm Trắng Merge Conflict',
    durationSeconds: 26,
    spawnInterval: 0.5,
    allowedTypes: ['syntax', 'nullPtr', 'loop', 'memLeak', 'conflict'],
  },
  {
    wave: 5,
    label: 'Đợt 5 · 23:58 Trận Chiến Đồ Án Tối Hậu',
    durationSeconds: 999,
    spawnInterval: 0.88,
    allowedTypes: ['syntax', 'nullPtr', 'loop', 'conflict'],
    bossType: 'bossDeadline',
  },
];

