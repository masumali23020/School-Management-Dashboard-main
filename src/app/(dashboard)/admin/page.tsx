import Announcements from "../../../components/Announcements";
import AttendenceChartContiner from "../../../components/AttendenceChartContiner";
import CountChart from "../../../components/CountChart";
import CountChartContinar from "../../../components/CountChartContinar";
import EvenClenderContainer from "../../../components/EvenClenderContainer";
import EventCalendar from "../../../components/EventCalendar";
import FinanceChart from "../../../components/FinanceChart";
import UserCard from "../../../components/UserCard";


const AdminPage  = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* USER CARDS */}
        <div className="flex gap-4 justify-between flex-wrap">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
          <UserCard type="parent" />
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChartContinar />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendenceChartContiner />
          </div>
        </div>
        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          <FinanceChart />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EvenClenderContainer  searchParams={searchParams}/>
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
