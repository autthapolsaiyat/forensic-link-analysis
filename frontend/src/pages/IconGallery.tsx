// src/pages/IconGallery.tsx
import {
  CaseIcon, SuspectIcon, ArrestedIcon, ReferenceIcon, VictimIcon,
  DNAIcon, SampleIcon, FingerprintIcon, DrugIcon,
  WeaponIcon, LocationIcon, VehicleIcon, PhoneIcon,
  MoneyIcon, LinkIcon, OrganizationIcon, EventIcon,
  SecureCaseIcon, DocumentIcon, TargetIcon, MagnifyIcon
} from '../components/ForensicIcons'

const icons = [
  { name: 'Case', component: CaseIcon, color: '#00d4ff', desc: 'คดี / เหตุการณ์' },
  { name: 'Suspect', component: SuspectIcon, color: '#ef233c', desc: 'ผู้ต้องสงสัย' },
  { name: 'Arrested', component: ArrestedIcon, color: '#f77f00', desc: 'ผู้ถูกจับกุม' },
  { name: 'Reference', component: ReferenceIcon, color: '#2ec4b6', desc: 'บุคคลอ้างอิง' },
  { name: 'Victim', component: VictimIcon, color: '#e63946', desc: 'ผู้เสียหาย' },
  { name: 'DNA', component: DNAIcon, color: '#4895ef', desc: 'หลักฐาน DNA' },
  { name: 'Sample', component: SampleIcon, color: '#4895ef', desc: 'วัตถุพยาน / ตัวอย่าง' },
  { name: 'Fingerprint', component: FingerprintIcon, color: '#a855f7', desc: 'ลายนิ้วมือ' },
  { name: 'Drug', component: DrugIcon, color: '#f72585', desc: 'ยาเสพติด' },
  { name: 'Weapon', component: WeaponIcon, color: '#6c757d', desc: 'อาวุธ' },
  { name: 'Location', component: LocationIcon, color: '#8338ec', desc: 'สถานที่' },
  { name: 'Vehicle', component: VehicleIcon, color: '#495057', desc: 'ยานพาหนะ' },
  { name: 'Phone', component: PhoneIcon, color: '#ffc300', desc: 'โทรศัพท์' },
  { name: 'Money', component: MoneyIcon, color: '#ffd60a', desc: 'การเงิน' },
  { name: 'Link', component: LinkIcon, color: '#00d4ff', desc: 'ความเชื่อมโยง' },
  { name: 'Organization', component: OrganizationIcon, color: '#7209b7', desc: 'องค์กร / กลุ่ม' },
  { name: 'Event', component: EventIcon, color: '#3a86ff', desc: 'เหตุการณ์ / Timeline' },
  { name: 'Secure Case', component: SecureCaseIcon, color: '#06d6a0', desc: 'คดีปิดผนึก' },
  { name: 'Document', component: DocumentIcon, color: '#adb5bd', desc: 'เอกสาร / รายงาน' },
  { name: 'Target', component: TargetIcon, color: '#e63946', desc: 'เป้าหมาย' },
  { name: 'Magnify', component: MagnifyIcon, color: '#00d4ff', desc: 'ค้นหาหลักฐาน' },
]

export default function IconGallery() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">🎨 Forensic Icon Gallery</h1>
      <p className="text-dark-100 mb-6">Custom SVG Icons แบบ i2 Analyst Style</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {icons.map(({ name, component: Icon, color, desc }) => (
          <div
            key={name}
            className="card bg-dark-200 p-4 flex flex-col items-center gap-3 hover:bg-dark-100/50 transition-colors"
          >
            {/* Large Icon */}
            <div className="w-16 h-16 flex items-center justify-center bg-dark-300 rounded-lg">
              <Icon size={40} color={color} />
            </div>
            
            {/* Icon Sizes */}
            <div className="flex items-center gap-2">
              <Icon size={16} color={color} />
              <Icon size={24} color={color} />
              <Icon size={32} color={color} />
            </div>
            
            {/* Name & Description */}
            <div className="text-center">
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-dark-100">{desc}</p>
            </div>
            
            {/* Color */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <code className="bg-dark-300 px-2 py-0.5 rounded">{color}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Example */}
      <div className="mt-8 card bg-dark-200 p-6">
        <h2 className="text-lg font-semibold mb-4">📖 Usage Example</h2>
        <pre className="bg-dark-300 p-4 rounded-lg text-sm overflow-x-auto">
{`import { SuspectIcon, DNAIcon, FingerprintIcon } from '../components/ForensicIcons'

// Basic usage
<SuspectIcon size={24} color="#ef233c" />

// With className
<DNAIcon size={32} color="#4895ef" className="animate-pulse" />

// Dynamic icon selection
import { ForensicIconMap, getForensicIcon } from '../components/ForensicIcons'

const IconComponent = ForensicIconMap['suspect']
<IconComponent size={24} color="#ef233c" />

// Or use helper
{getForensicIcon('fingerprint', { size: 24, color: '#a855f7' })}`}
        </pre>
      </div>

      {/* Network Graph Example */}
      <div className="mt-8 card bg-dark-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🔗 Network Graph Example</h2>
        <div className="flex items-center justify-center gap-8 py-8 bg-dark-300 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <CaseIcon size={48} color="#00d4ff" />
            <span className="text-xs">คดี 10-67-17807</span>
          </div>
          
          <div className="w-16 h-0.5 bg-primary-500" />
          
          <div className="flex flex-col items-center gap-2">
            <SampleIcon size={40} color="#4895ef" />
            <span className="text-xs">วัตถุพยาน</span>
          </div>
          
          <div className="w-16 h-0.5 bg-red-500" />
          
          <div className="flex flex-col items-center gap-2">
            <SuspectIcon size={48} color="#ef233c" />
            <span className="text-xs">ผู้ต้องสงสัย</span>
          </div>
          
          <div className="w-16 h-0.5 bg-purple-500 border-dashed border-t-2 border-purple-500" style={{ borderStyle: 'dashed' }} />
          
          <div className="flex flex-col items-center gap-2">
            <CaseIcon size={40} color="#a855f7" />
            <span className="text-xs">คดีเชื่อมโยง</span>
          </div>
        </div>
      </div>

      {/* Entity Types for Network */}
      <div className="mt-8 card bg-dark-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🎯 Entity Types for Link Analysis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-dark-300 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-primary-500">📁 Cases</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CaseIcon size={20} color="#00d4ff" />
                <span>Main Case</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CaseIcon size={20} color="#a855f7" />
                <span>Linked Case</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <SecureCaseIcon size={20} color="#06d6a0" />
                <span>Closed Case</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-300 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-red-400">👤 Persons</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <SuspectIcon size={20} color="#ef233c" />
                <span>Suspect</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrestedIcon size={20} color="#f77f00" />
                <span>Arrested</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <VictimIcon size={20} color="#e63946" />
                <span>Victim</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ReferenceIcon size={20} color="#2ec4b6" />
                <span>Reference</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-300 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-blue-400">🔬 Evidence</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <DNAIcon size={20} color="#4895ef" />
                <span>DNA</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FingerprintIcon size={20} color="#a855f7" />
                <span>Fingerprint</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <SampleIcon size={20} color="#4895ef" />
                <span>Sample</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DrugIcon size={20} color="#f72585" />
                <span>Drug</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-300 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-yellow-400">📦 Objects</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <WeaponIcon size={20} color="#6c757d" />
                <span>Weapon</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <VehicleIcon size={20} color="#495057" />
                <span>Vehicle</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <PhoneIcon size={20} color="#ffc300" />
                <span>Phone</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MoneyIcon size={20} color="#ffd60a" />
                <span>Money</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
