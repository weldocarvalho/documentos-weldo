using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceWorker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ApplySnakeCaseNamingConvention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScheduleItems_Schedules_ScheduleId",
                table: "ScheduleItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Schedules",
                table: "Schedules");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SkinAnalyses",
                table: "SkinAnalyses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ScheduleItems",
                table: "ScheduleItems");

            migrationBuilder.RenameTable(
                name: "Schedules",
                newName: "schedules");

            migrationBuilder.RenameTable(
                name: "SkinAnalyses",
                newName: "skin_analyses");

            migrationBuilder.RenameTable(
                name: "ScheduleItems",
                newName: "schedule_items");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "schedules",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "schedules",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "PatientId",
                table: "schedules",
                newName: "patient_id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "schedules",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "RecommendationsJson",
                table: "skin_analyses",
                newName: "recommendations_json");

            migrationBuilder.RenameColumn(
                name: "PacienteId",
                table: "skin_analyses",
                newName: "paciente_id");

            migrationBuilder.RenameColumn(
                name: "OverallHealthScore",
                table: "skin_analyses",
                newName: "overall_health_score");

            migrationBuilder.RenameColumn(
                name: "ConditionsJson",
                table: "skin_analyses",
                newName: "conditions_json");

            migrationBuilder.RenameColumn(
                name: "AnalyzedAt",
                table: "skin_analyses",
                newName: "analyzed_at");

            migrationBuilder.RenameColumn(
                name: "AnalysisId",
                table: "skin_analyses",
                newName: "analysis_id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "schedule_items",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UsageInstruction",
                table: "schedule_items",
                newName: "usage_instruction");

            migrationBuilder.RenameColumn(
                name: "ScheduleId",
                table: "schedule_items",
                newName: "schedule_id");

            migrationBuilder.RenameColumn(
                name: "ScheduleDay",
                table: "schedule_items",
                newName: "schedule_day");

            migrationBuilder.RenameColumn(
                name: "RecommendedProduct",
                table: "schedule_items",
                newName: "recommended_product");

            migrationBuilder.RenameIndex(
                name: "IX_ScheduleItems_ScheduleId",
                table: "schedule_items",
                newName: "ix_schedule_items_schedule_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_schedules",
                table: "schedules",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_skin_analyses",
                table: "skin_analyses",
                column: "analysis_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_schedule_items",
                table: "schedule_items",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_schedule_items_schedules_schedule_id",
                table: "schedule_items",
                column: "schedule_id",
                principalTable: "schedules",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_schedule_items_schedules_schedule_id",
                table: "schedule_items");

            migrationBuilder.DropPrimaryKey(
                name: "pk_schedules",
                table: "schedules");

            migrationBuilder.DropPrimaryKey(
                name: "pk_skin_analyses",
                table: "skin_analyses");

            migrationBuilder.DropPrimaryKey(
                name: "pk_schedule_items",
                table: "schedule_items");

            migrationBuilder.RenameTable(
                name: "schedules",
                newName: "Schedules");

            migrationBuilder.RenameTable(
                name: "skin_analyses",
                newName: "SkinAnalyses");

            migrationBuilder.RenameTable(
                name: "schedule_items",
                newName: "ScheduleItems");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "Schedules",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Schedules",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "patient_id",
                table: "Schedules",
                newName: "PatientId");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "Schedules",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "recommendations_json",
                table: "SkinAnalyses",
                newName: "RecommendationsJson");

            migrationBuilder.RenameColumn(
                name: "paciente_id",
                table: "SkinAnalyses",
                newName: "PacienteId");

            migrationBuilder.RenameColumn(
                name: "overall_health_score",
                table: "SkinAnalyses",
                newName: "OverallHealthScore");

            migrationBuilder.RenameColumn(
                name: "conditions_json",
                table: "SkinAnalyses",
                newName: "ConditionsJson");

            migrationBuilder.RenameColumn(
                name: "analyzed_at",
                table: "SkinAnalyses",
                newName: "AnalyzedAt");

            migrationBuilder.RenameColumn(
                name: "analysis_id",
                table: "SkinAnalyses",
                newName: "AnalysisId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "ScheduleItems",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "usage_instruction",
                table: "ScheduleItems",
                newName: "UsageInstruction");

            migrationBuilder.RenameColumn(
                name: "schedule_id",
                table: "ScheduleItems",
                newName: "ScheduleId");

            migrationBuilder.RenameColumn(
                name: "schedule_day",
                table: "ScheduleItems",
                newName: "ScheduleDay");

            migrationBuilder.RenameColumn(
                name: "recommended_product",
                table: "ScheduleItems",
                newName: "RecommendedProduct");

            migrationBuilder.RenameIndex(
                name: "ix_schedule_items_schedule_id",
                table: "ScheduleItems",
                newName: "IX_ScheduleItems_ScheduleId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Schedules",
                table: "Schedules",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SkinAnalyses",
                table: "SkinAnalyses",
                column: "AnalysisId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ScheduleItems",
                table: "ScheduleItems",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduleItems_Schedules_ScheduleId",
                table: "ScheduleItems",
                column: "ScheduleId",
                principalTable: "Schedules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
