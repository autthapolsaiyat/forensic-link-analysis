// src/pages/CaseDetailPage.tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Users, Package, MapPin, Image, FlaskConical,
  Clock, ChevronLeft, Link2, GitBranch, Download, Printer,
  Building, User, AlertTriangle
} from 'lucide-react'
import { casesApi } from '../services/api'

// Helper function to generate FIDS No.
const generateFidsNo = (caseNumber: string, sampleCount: number = 0): string => {
  if (!caseNumber) return '-'
  
  const parts = caseNumber.split('-')
  if (parts.length < 3) return caseNumber
  
  const center = parts[0]
  let yearPart = parts[1]
  const runningNum = parts[2]
  
  const year = yearPart.replace(/[^0-9]/g, '').substring(0, 2)
  const sampleStr = String(sampleCount).padStart(4, '0')
  const runningStr = runningNum.padStart(5, '0')
  
  return `${center}-DNA-${year}-${runningStr}-${sampleStr}`
}

type TabType = 'details' | 'persons' | 'evidence' | 'map' | 'photos' | 'results' | 'status'

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'details', label: 'รายละเอียด', icon: <FileText className="w-4 h-4" /> },
  { id: 'persons', label: 'บุคคลที่เกี่ยวข้อง', icon: <Users className="w-4 h-4" /> },
  { id: 'evidence', label: 'วัตถุพยาน', icon: <Package className="w-4 h-4" /> },
  { id: 'map', label: 'แผนที่', icon: <MapPin className="w-4 h-4" /> },
  { id: 'photos', label: 'รูปภาพ', icon: <Image className="w-4 h-4" /> },
  { id: 'results', label: 'ผลตรวจพิสูจน์', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 'status', label: 'สถานะวัตถุพยาน', icon: <Clock className="w-4 h-4" /> },
]

export default function CaseDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<TabType>('details')

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.getById(id!),
    enabled: !!id,
  })

  const { data: samples } = useQuery({
    queryKey: ['case-samples', id],
    queryFn: () => casesApi.getSamples(id!),
    enabled: !!id,
  })

  const { data: persons } = useQuery({
    queryKey: ['case-persons', id],
    queryFn: () => casesApi.getPersons(id!),
    enabled: !!id,
  })

  const { data: links } = useQuery({
    queryKey: ['case-links', id],
    queryFn: () => casesApi.getLinks(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    )
  }

  const caseInfo = caseData

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-dark-200 border-b border-dark-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/cases" className="p-2 hover:bg-dark-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">
                  กลุ่มงานตรวจชีววิทยาและดีเอ็นเอ เลขคดี : {generateFidsNo(caseInfo?.case_number || '', samples?.length || 0)}
                </h1>
                {links && links.length > 0 && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    พบการเชื่อมโยง {links.length} คดี
                  </span>
                )}
              </div>
              <p className="text-sm text-dark-100 mt-1">
                Case No. {caseInfo?.case_number} | {caseInfo?.province}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" />
              พิมพ์
            </button>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <Link
              to={`/graph/case/${id}`}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <GitBranch className="w-4 h-4" />
              ดู Graph
            </Link>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${(caseInfo as any)?.case_closed ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></span>
            <span className="text-sm">{(caseInfo as any)?.case_closed ? 'ปิดคดี' : 'ดำเนินการ'}</span>
          </div>
          <span className="text-dark-100">|</span>
          <span className="text-sm text-dark-100">
            วันที่รับ: {(caseInfo as any)?.received_date ? new Date((caseInfo as any).received_date).toLocaleDateString('th-TH') : '-'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-200 border-b border-dark-100 px-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-dark-100 hover:text-white hover:border-dark-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'persons' && persons?.length > 0 && (
                <span className="px-1.5 py-0.5 bg-dark-100 rounded text-xs">{persons.length}</span>
              )}
              {tab.id === 'evidence' && samples?.length > 0 && (
                <span className="px-1.5 py-0.5 bg-dark-100 rounded text-xs">{samples.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'details' && (
          <DetailsTab caseData={caseInfo} links={links} sampleCount={samples?.length || 0} />
        )}
        {activeTab === 'persons' && (
          <PersonsTab persons={persons || []} />
        )}
        {activeTab === 'evidence' && (
          <EvidenceTab samples={samples || []} />
        )}
        {activeTab === 'map' && (
          <MapTab caseData={caseInfo} />
        )}
        {activeTab === 'results' && (
          <ResultsTab samples={samples || []} />
        )}
      </div>
    </div>
  )
}

// Details Tab
function DetailsTab({ caseData, links, sampleCount }: { caseData: any; links: any[]; sampleCount: number }) {
  // Helper function for FIDS No
  const getFidsNo = (caseNumber: string, samples: number): string => {
    if (!caseNumber) return '-'
    const parts = caseNumber.split('-')
    if (parts.length < 3) return caseNumber
    const center = parts[0]
    const yearPart = parts[1]
    const runningNum = parts[2]
    const year = yearPart.replace(/[^0-9]/g, '').substring(0, 2)
    const sampleStr = String(samples).padStart(4, '0')
    const runningStr = runningNum.padStart(5, '0')
    return `${center}-DNA-${year}-${runningStr}-${sampleStr}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            ข้อมูลคดี
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="FIDS No." value={getFidsNo(caseData?.case_number, sampleCount)} />
            <InfoField label="Case No." value={caseData?.case_number} />
            <InfoField label="เลขที่หนังสือนำส่ง" value={caseData?.document_number} />
            <InfoField label="วันที่หนังสือนำส่ง" value={caseData?.document_date ? new Date(caseData.document_date).toLocaleDateString('th-TH') : '-'} />
            <InfoField label="ประเภทคดี" value={caseData?.case_type} />
            <InfoField label="หมวดหมู่" value={caseData?.case_category} />
            <InfoField label="วันที่เกิดเหตุ" value={caseData?.case_date ? new Date(caseData.case_date).toLocaleDateString('th-TH') : '-'} />
            <InfoField label="เวลาเกิดเหตุ" value={caseData?.case_date ? new Date(caseData.case_date).toLocaleTimeString('th-TH') : '-'} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" />
            สถานที่เกิดเหตุ
          </h3>
          <p className="text-white bg-dark-300 p-4 rounded-lg">
            {caseData?.scene_address || 'ไม่ระบุ'}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <InfoField label="จังหวัด" value={caseData?.province} />
            <InfoField label="สถานีตำรวจ" value={caseData?.police_station} />
            <InfoField label="ข้อหา" value={caseData?.case_type} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            ผู้เกี่ยวข้อง
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="ผู้กล่าวหา" value={caseData?.accuser_name} />
            <InfoField label="ผู้ถูกกล่าวหา" value={caseData?.accused_name} />
            <InfoField label="ผู้ต้องหา" value={caseData?.suspect_given_name} />
            <InfoField label="ผู้เสียหาย" value={caseData?.victim_given_name} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Links */}
        {links && links.length > 0 && (
          <div className="card border-purple-500/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-400">
              <Link2 className="w-5 h-5" />
              คดีที่เชื่อมโยง ({links.length})
            </h3>
            <div className="space-y-2">
              {links.map((link: any) => (
                <Link
                  key={link.link_id}
                  to={`/cases/${link.case1_id === caseData?.case_id ? link.case2_id : link.case1_id}`}
                  className="block p-3 bg-dark-300 rounded-lg hover:bg-dark-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">
                      {link.case1_number === caseData?.case_number ? link.case2_number : link.case1_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      link.link_type === 'DNA_MATCH' ? 'bg-red-500/20 text-red-400' : 'bg-primary-500/20 text-primary-500'
                    }`}>
                      {link.link_type === 'DNA_MATCH' ? 'DNA' : 'ID'}
                    </span>
                  </div>
                  <p className="text-xs text-dark-100 mt-1">
                    {link.case1_province === caseData?.province ? link.case2_province : link.case1_province}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Agent Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-primary-500" />
            ข้อมูลผู้ส่งตรวจ
          </h3>
          <div className="space-y-3">
            <InfoField label="ผู้ส่งตรวจ" value={caseData?.sender_name} />
            <InfoField label="เจ้าหน้าที่" value={caseData?.agent_name} />
            <InfoField label="โทรศัพท์" value={caseData?.agent_tel} />
            <InfoField label="นักวิทยาศาสตร์" value={caseData?.analyst_name} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Info Field Component
function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-dark-100 mb-1">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  )
}

// Persons Tab
function PersonsTab({ persons }: { persons: any[] }) {
  if (persons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-100">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ไม่พบข้อมูลบุคคลที่เกี่ยวข้อง</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {persons.map((person: any) => (
        <Link
          key={person.person_id}
          to={`/graph/person/${person.person_id}`}
          className="card hover:border-primary-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{person.full_name}</p>
              <p className="text-sm font-mono text-dark-100">{person.id_number}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              person.role === 'Suspect' ? 'bg-red-500/20 text-red-400' :
              person.role === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
              'bg-primary-500/20 text-primary-500'
            }`}>
              {person.role}
            </span>
          </div>
          {person.total_cases > 1 && (
            <div className="mt-3 pt-3 border-t border-dark-100 flex items-center gap-2 text-purple-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">พบใน {person.total_cases} คดี</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

// Evidence Tab
function EvidenceTab({ samples }: { samples: any[] }) {
  if (samples.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-100">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ไม่พบข้อมูลวัตถุพยาน</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {samples.map((sample: any) => (
        <div key={sample.sample_id} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono font-semibold">{sample.lab_number}</p>
              <p className="text-sm text-dark-100 mt-1">{sample.sample_type}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-dark-100 rounded">
              {sample.sample_source || 'ไม่ระบุแหล่งที่มา'}
            </span>
          </div>
          {sample.dna_profile && (
            <div className="mt-3 pt-3 border-t border-dark-100">
              <p className="text-xs text-dark-100 mb-1">DNA Profile</p>
              <p className="font-mono text-sm bg-dark-300 p-2 rounded overflow-x-auto">
                {sample.dna_profile}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Map Tab
function MapTab({ caseData }: { caseData: any }) {
  return (
    <div className="card h-96 flex items-center justify-center">
      <div className="text-center text-dark-100">
        <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">แผนที่สถานที่เกิดเหตุ</p>
        <p className="text-sm mt-2">{caseData?.scene_address || 'ไม่ระบุที่อยู่'}</p>
        <p className="text-sm">{caseData?.province}</p>
        <p className="mt-4 text-xs">* ฟีเจอร์แผนที่กำลังพัฒนา</p>
      </div>
    </div>
  )
}

// Results Tab
function ResultsTab({ samples }: { samples: any[] }) {
  const samplesWithResults = samples.filter(s => s.dna_profile || s.analysis_result)
  
  if (samplesWithResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-100">
        <div className="text-center">
          <FlaskConical className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ไม่พบผลการตรวจพิสูจน์</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {samplesWithResults.map((sample: any) => (
        <div key={sample.sample_id} className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">{sample.lab_number}</h4>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
              ตรวจเสร็จสิ้น
            </span>
          </div>
          <div className="bg-dark-300 p-4 rounded-lg">
            <p className="text-xs text-dark-100 mb-2">DNA Profile</p>
            <p className="font-mono text-sm whitespace-pre-wrap">
              {sample.dna_profile || sample.analysis_result || 'ไม่มีข้อมูล'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
